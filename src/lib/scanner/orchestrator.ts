import { AnalysisResult, CookieInfo, DataSourceItem, HistoryInfo, TlsInfo } from '../types';
import { getApexDomain, isIpAddress, mapLimit } from '../utils';
import { assertPublicHost, guardedFetch, readTextCapped, TargetError } from './netGuard';
import { detectTechStack } from './techDetector';
import { classifyEndpoint, ContentSource, extractDataSources } from './endpointExtractor';
import { scanForSecrets } from './secretScanner';
import { fetchWaybackHistory } from './waybackScanner';
import { fetchDnsAndGeo } from './dnsScanner';
import { auditSecurity, parseSetCookie } from './securityAuditor';
import { runNetworkScanner } from './networkScanner';
import { fetchSubdomains } from './subdomainScanner';
import { inspectTls } from './tlsScanner';
import { checkHttpsRedirect, probePaths } from './pathProbe';
import { buildGraph } from './graphBuilder';

export interface PreparedTarget {
  targetUrl: string;
  hostname: string;
  isIp: boolean;
}

const MAX_STATIC_SCRIPTS = 10;
const MAX_SCRIPT_BYTES = 2_000_000;
const ANALYTICS_COOKIE = /^(?:_ga|_gid|_gat|_gcl|_fbp|_fbc|_hj|_clck|_clsk|_uet|_parsely|ajs_|mp_|amp_|_pk_|__utm|_tt_|_li|intercom-|__hs|hubspot)/i;

/** Normalise user input into a URL and refuse private / reserved targets. Throws TargetError. */
export async function prepareTarget(input: string): Promise<PreparedTarget> {
  let raw = input.trim();
  if (!raw) throw new TargetError('Please provide a URL, domain or IP address.');
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) throw new TargetError('Only http:// and https:// targets are supported.');
    raw = `https://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new TargetError(`"${input}" is not a valid URL or domain.`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const isIp = isIpAddress(hostname);
  if (!isIp && !hostname.includes('.')) throw new TargetError(`"${hostname}" is not a fully-qualified domain name.`);
  await assertPublicHost(hostname);

  parsed.hash = '';
  return { targetUrl: parsed.toString(), hostname, isIp };
}

interface PageFetch {
  status: number;
  finalUrl: string;
  headers: Record<string, string>;
  setCookies: string[];
  html: string;
}

async function fetchPage(url: string, log: (l: string) => void): Promise<PageFetch | null> {
  try {
    log(`[HTTP] GET ${url}`);
    const { response, finalUrl, redirects } = await guardedFetch(url, {
      headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    redirects.forEach((r) => log(`[HTTP]   -> redirected to ${r}`));

    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => (headers[k] = v));
    const html = await readTextCapped(response, 3_000_000);
    log(`[HTTP] ${response.status} ${response.statusText} - ${html.length} bytes, ${Object.keys(headers).length} response headers.`);
    return { status: response.status, finalUrl, headers, setCookies: response.headers.getSetCookie(), html };
  } catch (err: any) {
    const reason = err instanceof TargetError ? err.message : err?.cause?.code || err?.message || 'timeout';
    log(`[WARNING] Direct HTTP fetch failed (${reason}) - relying on headless browser and passive sources.`);
    return null;
  }
}

function extractScriptUrls(html: string, baseUrl: string, apex: string): string[] {
  const urls = new Set<string>();
  const regex = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try {
      const abs = new URL(m[1].replace(/&amp;/g, '&'), baseUrl);
      if (abs.protocol === 'http:' || abs.protocol === 'https:') urls.add(abs.toString());
    } catch {}
  }
  // First-party bundles carry the interesting endpoints; third-party SDKs mostly carry noise
  const isFirstParty = (u: string) => new URL(u).hostname.endsWith(apex);
  return Array.from(urls).sort((a, b) => Number(isFirstParty(b)) - Number(isFirstParty(a)));
}

async function fetchScripts(urls: string[]): Promise<{ url: string; body: string }[]> {
  const bodies = await mapLimit(urls, 5, async (url) => {
    try {
      const { response } = await guardedFetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      return { url, body: await readTextCapped(response, MAX_SCRIPT_BYTES) };
    } catch {
      return null;
    }
  });
  return bodies.filter((b): b is { url: string; body: string } => b !== null);
}

function scriptLabel(url: string, pageHost: string): string {
  try {
    const u = new URL(url);
    const file = u.pathname.split('/').filter(Boolean).pop() || u.pathname;
    return u.hostname === pageHost ? file : `${u.hostname}/${file}`;
  } catch {
    return url.slice(0, 60);
  }
}

export async function runFullAnalysis(target: PreparedTarget, onLog?: (line: string) => void): Promise<AnalysisResult> {
  const startTime = Date.now();
  const terminalLogs: string[] = [];
  const log = (line: string) => {
    terminalLogs.push(line);
    onLog?.(line);
  };

  const { targetUrl, hostname, isIp } = target;
  const apex = isIp ? hostname : getApexDomain(hostname);
  log(`[SYSTEM] Webalyzer recon session started for ${targetUrl}`);

  // ---- Independent passive lookups start immediately and run in parallel ----
  const emptyHistory: HistoryInfo = { firstOnlineDate: null, waybackUrl: null, totalSnapshots: 0 };
  log('[WAYBACK] Querying Internet Archive capture history...');
  const historyP = isIp
    ? Promise.resolve(emptyHistory)
    : fetchWaybackHistory(hostname).then((h) => {
        log(h.firstOnlineDate ? `[WAYBACK] First archived ${h.firstOnlineDate}, last ${h.lastSeenDate || 'n/a'}, ${h.totalSnapshots.toLocaleString()} captures.` : '[WAYBACK] No archive captures found for this host.');
        return h;
      });

  log('[DNS] Resolving records via Cloudflare DNS-over-HTTPS...');
  const dnsP = fetchDnsAndGeo(hostname).then((d) => {
    const where = d.location ? ` (${d.location.org}, ${d.location.country})` : '';
    log(`[DNS] ${hostname} -> ${d.ip || 'no A/AAAA record'}${where}${d.providers.dns ? `, DNS by ${d.providers.dns}` : ''}${d.providers.email ? `, email by ${d.providers.email}` : ''}.`);
    return d;
  });

  if (!isIp) log(`[OSINT] Enumerating subdomains of ${apex} from Certificate Transparency logs...`);
  const subsP = isIp
    ? Promise.resolve({ items: [], total: 0 })
    : fetchSubdomains(apex, log).then((s) => {
        log(`[OSINT] ${s.total} unique subdomains found in CT logs (${s.items.filter((i) => i.resolves).length} resolved so far).`);
        return s;
      });

  const browserP = runNetworkScanner(targetUrl, log);
  const redirectP = targetUrl.startsWith('https://') ? checkHttpsRedirect(hostname) : Promise.resolve(false);

  // ---- Active HTTP fetch of the target ----
  const page = await fetchPage(targetUrl, log);
  const finalUrl = page?.finalUrl || targetUrl;
  const final = new URL(finalUrl);

  log(final.protocol === 'https:' ? `[TLS] Inspecting certificate for ${final.hostname}...` : '[TLS] Target is plain HTTP - skipping certificate check.');
  const tlsP: Promise<TlsInfo> =
    final.protocol === 'https:' ? inspectTls(final.hostname, Number(final.port) || 443) : Promise.resolve({ checked: false, valid: false });
  const probeP = probePaths(final.origin, log);

  const scriptUrls = page ? extractScriptUrls(page.html, finalUrl, apex) : [];
  log(`[DOM] ${scriptUrls.length} <script src> bundles referenced; downloading up to ${MAX_STATIC_SCRIPTS} for analysis...`);
  const [browser, staticScripts] = await Promise.all([browserP, fetchScripts(scriptUrls.slice(0, MAX_STATIC_SCRIPTS))]);

  // ---- Merge static + browser views ----
  const headers = page?.headers || browser.documentHeaders;
  const httpStatus = page?.status ?? browser.documentStatus;
  const scripts = new Map<string, string>();
  for (const s of [...staticScripts, ...browser.scripts]) if (!scripts.has(s.url)) scripts.set(s.url, s.body);
  const allScriptUrls = Array.from(new Set([...scriptUrls, ...scripts.keys()]));
  log(`[INSPECT] Analysing ${scripts.size} JavaScript bundles (${(Array.from(scripts.values()).reduce((a, b) => a + b.length, 0) / 1024).toFixed(0)} KB).`);

  // Audit server-set cookies only; JS-set analytics cookies can never be HttpOnly and would just add noise
  const cookies: CookieInfo[] = page?.setCookies.length
    ? page.setCookies.map(parseSetCookie)
    : browser.cookies
        .filter((c) => final.hostname.endsWith(c.domain) && !ANALYTICS_COOKIE.test(c.name))
        .map(({ domain: _domain, ...c }) => c);
  const cookieNames = Array.from(new Set([...cookies.map((c) => c.name), ...browser.cookies.map((c) => c.name)]));

  const sources: ContentSource[] = [
    { label: 'HTML', content: page?.html || '' },
    { label: 'Rendered DOM', content: browser.renderedHtml },
    ...Array.from(scripts.entries()).map(([url, body]) => ({ label: scriptLabel(url, final.hostname), content: body })),
  ];

  // Loaded resource URLs are appended to the HTML haystack so dynamically-injected SDKs are fingerprinted too
  const resourceUrls = [...allScriptUrls, ...browser.requests.map((r) => r.url)].join('\n');
  const techStack = detectTechStack({
    html: [page?.html, browser.renderedHtml, resourceUrls].filter(Boolean).join('\n'),
    scriptUrls: allScriptUrls,
    scriptContents: Array.from(scripts.values()),
    headers,
    cookieNames,
    url: finalUrl,
    jsGlobals: browser.jsGlobals,
  });
  log(`[ENGINE] Fingerprinted ${techStack.length} technologies: ${techStack.map((t) => (t.version ? `${t.name} ${t.version}` : t.name)).join(', ') || 'none'}.`);

  const dataSources = extractDataSources(sources, finalUrl);
  const seen = new Set(dataSources.map((d) => `${d.type}|${d.resolvedUrl || d.url}`.split('?')[0]));
  for (const req of browser.requests) {
    let parsed: URL;
    try {
      parsed = new URL(req.url);
    } catch {
      continue;
    }
    const type = classifyEndpoint(req.url);
    const url = type === 'Telemetry / Tracking' ? `${parsed.origin}/` : req.url;
    const key = `${type}|${type === 'Telemetry / Tracking' ? url : parsed.origin + parsed.pathname}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dataSources.push({
      type,
      url,
      resolvedUrl: url,
      host: parsed.hostname,
      method: req.resourceType === 'websocket' ? 'WS' : ((['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req.method : 'UNKNOWN') as DataSourceItem['method']),
      source: `Headless browser (${req.resourceType})`,
      confidence: 100,
    });
  }
  log(`[MINE] ${dataSources.length} endpoints & data sources extracted (${dataSources.filter((d) => d.type !== 'Telemetry / Tracking' && d.type !== 'REST API').length} cloud / data services).`);

  const secrets = scanForSecrets(sources);
  if (secrets.length) log(`[SECRETS] ${secrets.length} potential credentials / tokens found in client code.`);

  // ---- Wait for the remaining parallel lookups ----
  const [history, dns, subs, tls, probe, httpsRedirect] = await Promise.all([historyP, dnsP, subsP, tlsP, probeP, redirectP]);
  if (tls.checked) log(tls.valid ? `[TLS] Valid certificate from ${tls.issuer}, ${tls.daysRemaining} days remaining (${tls.protocol}).` : `[WARNING] TLS problem: ${tls.error}`);

  log('[SECURITY] Scoring headers, TLS, cookies, exposed files and secrets...');
  const security = auditSecurity({ headers, finalUrl, tls, httpsRedirect, cookies, exposedFiles: probe.exposed, secrets, dataSources, dns });
  log(`[SECURITY] Grade ${security.riskScore} (${security.score}/100) with ${security.findings.filter((f) => f.severity !== 'info').length} issues.`);

  const graphData = buildGraph({ domain: hostname, dns, techStack, dataSources });

  const executionTimeMs = Date.now() - startTime;
  log(`[SUCCESS] Analysis completed in ${(executionTimeMs / 1000).toFixed(1)}s.`);

  return {
    targetUrl,
    finalUrl: browser.finalUrl && !page ? browser.finalUrl : finalUrl,
    httpStatus,
    domain: hostname,
    analyzedAt: new Date().toISOString(),
    executionTimeMs,
    techStack,
    dataSources,
    secrets,
    history,
    dns,
    security,
    exposedFiles: probe.exposed,
    robots: probe.robots,
    subdomains: subs.items,
    subdomainTotal: subs.total,
    graphData,
    terminalLogs,
  };
}
