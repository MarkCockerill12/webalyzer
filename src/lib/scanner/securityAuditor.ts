import { CookieInfo, DataSourceItem, DnsInfo, ExposedFile, SecretFinding, SecurityFinding, SecurityInfo, Severity, TlsInfo } from '../types';
import { hasInlineCredentials } from './endpointExtractor';

export interface AuditInput {
  headers: Record<string, string>;
  finalUrl: string;
  tls: TlsInfo;
  httpsRedirect: boolean | null;
  cookies: CookieInfo[];
  exposedFiles: ExposedFile[];
  secrets: SecretFinding[];
  dataSources: DataSourceItem[];
  dns: DnsInfo;
}

const PENALTY: Record<Severity, number> = { critical: 40, high: 20, medium: 8, low: 3, info: 0 };
const ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SESSION_COOKIE = /sess|sid|auth|token|jwt|login|remember/i;

/** Parse a raw Set-Cookie header value into its security-relevant flags. */
export function parseSetCookie(raw: string): CookieInfo {
  const [pair, ...attrs] = raw.split(';');
  const lowerAttrs = attrs.map((a) => a.trim().toLowerCase());
  return {
    name: pair.split('=')[0].trim(),
    secure: lowerAttrs.includes('secure'),
    httpOnly: lowerAttrs.includes('httponly'),
    sameSite: lowerAttrs.find((a) => a.startsWith('samesite='))?.split('=')[1],
  };
}

export function auditSecurity(input: AuditInput): SecurityInfo {
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.headers)) h[k.toLowerCase()] = String(v);

  const findings: SecurityFinding[] = [];
  const add = (severity: Severity, title: string, detail?: string) => findings.push({ severity, title, detail });

  const isHttps = input.finalUrl.startsWith('https://');
  const csp = h['content-security-policy'];
  const hsts = h['strict-transport-security'];

  // --- Transport ---
  if (!isHttps) add('high', 'Site served over plain HTTP', 'Traffic can be read and modified in transit.');
  if (input.tls.checked) {
    if (!input.tls.valid) add('high', 'TLS certificate not trusted', input.tls.error);
    if (input.tls.daysRemaining !== undefined) {
      if (input.tls.daysRemaining < 0) add('high', 'TLS certificate expired', `Expired ${-input.tls.daysRemaining} days ago.`);
      else if (input.tls.daysRemaining < 14) add('medium', 'TLS certificate expires within 14 days', `${input.tls.daysRemaining} days remaining.`);
    }
    if (input.tls.protocol && /TLSv1(?:\.[01])?$/.test(input.tls.protocol)) add('medium', `Outdated TLS protocol negotiated (${input.tls.protocol})`);
  }
  if (input.httpsRedirect === false) add('medium', 'HTTP does not redirect to HTTPS', 'Visitors typing the bare domain stay on an unencrypted connection.');

  // --- Security headers ---
  if (isHttps && !hsts) add('medium', 'Missing Strict-Transport-Security (HSTS)');
  else if (hsts) {
    const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] || 0);
    if (maxAge < 15_552_000) add('low', 'HSTS max-age shorter than 180 days', `max-age=${maxAge}`);
  }
  if (!csp) add('medium', 'Missing Content-Security-Policy', 'No defence-in-depth against XSS / injected scripts.');
  else {
    const scriptSrc = csp.match(/script-src[^;]*/i)?.[0] || csp.match(/default-src[^;]*/i)?.[0] || '';
    if (/'unsafe-inline'/.test(scriptSrc) && !/'nonce-|'sha(?:256|384|512)-|'strict-dynamic'/.test(scriptSrc)) {
      add('low', "CSP allows 'unsafe-inline' scripts", 'Weakens the policy against XSS.');
    }
    if (/'unsafe-eval'/.test(scriptSrc)) add('low', "CSP allows 'unsafe-eval'");
  }
  if (!h['x-frame-options'] && !/frame-ancestors/i.test(csp || '')) add('medium', 'No clickjacking protection', 'Neither X-Frame-Options nor CSP frame-ancestors is set.');
  if ((h['x-content-type-options'] || '').toLowerCase() !== 'nosniff') add('low', 'Missing X-Content-Type-Options: nosniff');
  if (!h['referrer-policy']) add('low', 'Missing Referrer-Policy');
  if (!h['permissions-policy']) add('info', 'No Permissions-Policy header');

  const cors = h['access-control-allow-origin'];
  if (cors === '*') {
    add(h['access-control-allow-credentials'] === 'true' ? 'medium' : 'low', 'Wildcard CORS (Access-Control-Allow-Origin: *)');
  }

  // --- Information disclosure ---
  if (h['server'] && /\d/.test(h['server'])) add('low', 'Server header discloses version', h['server']);
  if (h['x-powered-by']) add('low', 'X-Powered-By header discloses stack', h['x-powered-by']);
  if (h['x-aspnet-version']) add('low', 'X-AspNet-Version header discloses version', h['x-aspnet-version']);

  // --- Cookies ---
  const insecure = input.cookies.filter((c) => isHttps && !c.secure).map((c) => c.name);
  const scriptable = input.cookies.filter((c) => SESSION_COOKIE.test(c.name) && !c.httpOnly).map((c) => c.name);
  const noSameSite = input.cookies.filter((c) => !c.sameSite).map((c) => c.name);
  if (insecure.length) add('low', 'Cookies without Secure flag', insecure.join(', '));
  if (scriptable.length) add('medium', 'Session-like cookies readable by JavaScript (no HttpOnly)', scriptable.join(', '));
  if (noSameSite.length) add('info', 'Cookies without SameSite attribute', noSameSite.join(', '));

  // --- Exposed files / endpoints / secrets ---
  for (const f of input.exposedFiles) {
    if (f.severity !== 'info') add(f.severity, f.label, f.url);
  }
  for (const s of input.secrets) {
    add(s.severity, `${s.kind} in client code`, `${s.masked} (${s.source})${s.note ? ' - ' + s.note : ''}`);
  }
  for (const db of input.dataSources.filter((d) => d.type === 'Database String')) {
    add(hasInlineCredentials(db.url) ? 'critical' : 'medium', 'Database connection string in client code', `${db.url} (${db.source})`);
  }
  const sharepoint = input.dataSources.filter((d) => d.type === 'SharePoint').length;
  if (sharepoint) add('info', `${sharepoint} SharePoint endpoints referenced in client code`);

  // --- Email authentication (DNS) ---
  if (input.dns.records.mx.length > 0 || input.dns.email.spf) {
    if (!input.dns.email.spf) add('low', 'No SPF record', 'Receiving servers cannot verify authorised senders.');
    if (!input.dns.email.dmarcPolicy) add('low', 'No DMARC record', 'Domain is easier to spoof in phishing emails.');
    else if (input.dns.email.dmarcPolicy === 'none') add('info', 'DMARC policy is p=none (monitor only)');
  }
  if (input.dns.records.ns.length > 0 && input.dns.records.caa.length === 0) add('info', 'No CAA record restricting certificate issuers');

  findings.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

  const score = Math.max(0, 100 - findings.reduce((acc, f) => acc + PENALTY[f.severity], 0));
  let riskScore: SecurityInfo['riskScore'] =
    score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  if (findings.some((f) => f.severity === 'critical')) riskScore = 'F';

  return {
    tls: input.tls,
    httpsRedirect: input.httpsRedirect,
    securityHeaders: {
      hsts,
      csp,
      xFrameOptions: h['x-frame-options'],
      xContentTypeOptions: h['x-content-type-options'],
      referrerPolicy: h['referrer-policy'],
      permissionsPolicy: h['permissions-policy'],
      corsPolicy: cors,
      server: h['server'],
      poweredBy: h['x-powered-by'],
    },
    cookies: input.cookies,
    score,
    riskScore,
    findings,
  };
}
