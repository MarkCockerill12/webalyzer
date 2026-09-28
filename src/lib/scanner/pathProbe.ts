import { ExposedFile, RobotsInfo, Severity } from '../types';
import { mapLimit } from '../utils';
import { guardedFetch, readTextCapped } from './netGuard';

interface Probe {
  path: string;
  label: string;
  severity: Severity;
  // Content check - guards against "soft 404" pages that return 200 for every path
  validate: (body: string, status: number) => boolean;
}

const isOk = (s: number) => s >= 200 && s < 300;
const notHtml = (b: string) => !/^\s*<(?:!doctype|html)/i.test(b);

const PROBES: Probe[] = [
  { path: '/.git/HEAD', label: 'Exposed Git repository (.git/HEAD)', severity: 'critical', validate: (b, s) => isOk(s) && b.trim().startsWith('ref: refs/') },
  { path: '/.git/config', label: 'Exposed Git config', severity: 'critical', validate: (b, s) => isOk(s) && /\[core\]/.test(b) && notHtml(b) },
  { path: '/.env', label: 'Exposed .env file', severity: 'critical', validate: (b, s) => isOk(s) && notHtml(b) && /^[A-Z][A-Z0-9_]{2,}=/m.test(b) },
  { path: '/.vscode/sftp.json', label: 'Exposed VS Code SFTP credentials', severity: 'critical', validate: (b, s) => isOk(s) && /"host"\s*:/.test(b) && /"(?:password|username)"/.test(b) },
  { path: '/actuator/env', label: 'Spring Boot actuator /env exposed', severity: 'high', validate: (b, s) => isOk(s) && /"propertySources"/.test(b) },
  { path: '/phpinfo.php', label: 'phpinfo() page exposed', severity: 'high', validate: (b, s) => isOk(s) && /<title>phpinfo\(\)<\/title>|PHP Version \d/.test(b) },
  { path: '/.DS_Store', label: 'macOS .DS_Store directory listing', severity: 'low', validate: (b, s) => isOk(s) && b.slice(4, 8) === 'Bud1' },
  { path: '/server-status', label: 'Apache server-status exposed', severity: 'medium', validate: (b, s) => isOk(s) && /Apache Server Status/i.test(b) },
  { path: '/elmah.axd', label: 'ELMAH error log exposed', severity: 'medium', validate: (b, s) => isOk(s) && /Error Log for/i.test(b) },
  { path: '/debug/pprof/', label: 'Go pprof debug endpoint exposed', severity: 'medium', validate: (b, s) => isOk(s) && /Types of profiles available/i.test(b) },
  { path: '/.htaccess', label: 'Readable .htaccess', severity: 'low', validate: (b, s) => isOk(s) && notHtml(b) && /RewriteEngine|RewriteRule|Require all|Deny from/i.test(b) },
  { path: '/xmlrpc.php', label: 'WordPress XML-RPC enabled', severity: 'low', validate: (b) => /XML-RPC server accepts POST requests only/i.test(b) },
  { path: '/crossdomain.xml', label: 'Flash crossdomain.xml policy', severity: 'info', validate: (b, s) => isOk(s) && /<cross-domain-policy/i.test(b) },
  { path: '/actuator/health', label: 'Spring Boot actuator /health', severity: 'info', validate: (b, s) => isOk(s) && /"status"\s*:\s*"(?:UP|DOWN)"/.test(b) },
  { path: '/swagger.json', label: 'OpenAPI / Swagger spec', severity: 'info', validate: (b, s) => isOk(s) && /"(?:swagger|openapi)"\s*:/.test(b) },
  { path: '/openapi.json', label: 'OpenAPI spec', severity: 'info', validate: (b, s) => isOk(s) && /"(?:swagger|openapi)"\s*:/.test(b) },
  { path: '/v3/api-docs', label: 'OpenAPI spec (springdoc)', severity: 'info', validate: (b, s) => isOk(s) && /"openapi"\s*:/.test(b) },
  { path: '/swagger-ui/index.html', label: 'Swagger UI', severity: 'info', validate: (b, s) => isOk(s) && /swagger-ui/i.test(b) },
  { path: '/graphql', label: 'GraphQL endpoint', severity: 'info', validate: (b, s) => [200, 400, 405].includes(s) && /"errors"\s*:|must provide (?:a )?query|GET query missing/i.test(b) },
  { path: '/wp-json/', label: 'WordPress REST API', severity: 'info', validate: (b, s) => isOk(s) && /"namespaces"\s*:/.test(b) },
  { path: '/.well-known/security.txt', label: 'security.txt disclosure policy', severity: 'info', validate: (b, s) => isOk(s) && notHtml(b) && /^(?:Contact|Expires):/im.test(b) },
  { path: '/robots.txt', label: 'robots.txt', severity: 'info', validate: (b, s) => isOk(s) && notHtml(b) && /^(?:user-agent|disallow|allow|sitemap)\s*:/im.test(b) },
  { path: '/sitemap.xml', label: 'XML sitemap', severity: 'info', validate: (b, s) => isOk(s) && /<(?:urlset|sitemapindex)\b/.test(b) },
];

function parseRobots(body: string): RobotsInfo {
  const disallow = new Set<string>();
  const sitemaps = new Set<string>();
  for (const line of body.split(/\r?\n/)) {
    const [rawKey, ...rest] = line.split(':');
    const value = rest.join(':').split('#')[0].trim();
    const key = rawKey.trim().toLowerCase();
    if (key === 'disallow' && value && value !== '/') disallow.add(value);
    if (key === 'sitemap' && value) sitemaps.add(value);
  }
  return { disallow: Array.from(disallow).slice(0, 100), sitemaps: Array.from(sitemaps).slice(0, 20) };
}

export async function probePaths(origin: string, log: (line: string) => void): Promise<{ exposed: ExposedFile[]; robots?: RobotsInfo }> {
  const exposed: ExposedFile[] = [];
  let robots: RobotsInfo | undefined;

  log(`[PROBE] Checking ${PROBES.length} well-known / sensitive paths on ${origin}...`);
  await mapLimit(PROBES, 6, async (probe) => {
    const url = origin + probe.path;
    try {
      const { response } = await guardedFetch(url, { maxRedirects: 0, signal: AbortSignal.timeout(6000) });
      const body = await readTextCapped(response, 64_000);
      if (!probe.validate(body, response.status)) return;
      exposed.push({ path: probe.path, url, label: probe.label, severity: probe.severity, status: response.status });
      if (probe.path === '/robots.txt') robots = parseRobots(body);
    } catch {}
  });

  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  exposed.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const notable = exposed.filter((e) => e.severity !== 'info').length;
  log(`[PROBE] ${exposed.length} paths responded with valid content (${notable} security-relevant).`);
  return { exposed, robots };
}

/** Does plain HTTP redirect to HTTPS? null = HTTP not reachable. */
export async function checkHttpsRedirect(hostname: string): Promise<boolean | null> {
  try {
    const { response, finalUrl } = await guardedFetch(`http://${hostname}/`, { maxRedirects: 4, signal: AbortSignal.timeout(8000) });
    await response.body?.cancel().catch(() => {});
    return finalUrl.startsWith('https://');
  } catch {
    return null;
  }
}
