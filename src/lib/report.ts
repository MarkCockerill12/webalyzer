import { AnalysisResult } from './types';

const list = (items: string[], empty = '_None_') => (items.length ? items.map((i) => `- ${i}`).join('\n') : empty);

export function buildMarkdownReport(r: AnalysisResult): string {
  const s = r.security;
  const dns = r.dns;
  const years = Object.entries(r.history.yearlySnapshots || {});

  return `# Webalyzer Reconnaissance Report

| | |
|---|---|
| Target | ${r.targetUrl} |
| Final URL | ${r.finalUrl} (HTTP ${r.httpStatus ?? 'n/a'}) |
| Host / Apex | ${r.domain} / ${r.history.apexDomain || r.domain} |
| Analysed | ${r.analyzedAt} (${(r.executionTimeMs / 1000).toFixed(1)}s) |
| Security grade | **${s.riskScore}** (${s.score}/100) |

## Security Findings (${s.findings.length})
${list(s.findings.map((f) => `**[${f.severity.toUpperCase()}]** ${f.title}${f.detail ? ` - ${f.detail}` : ''}`))}

### TLS
${s.tls.checked ? list([
  `Trusted: ${s.tls.valid ? 'yes' : `no (${s.tls.error})`}`,
  `Issuer: ${s.tls.issuer || 'n/a'} / Subject: ${s.tls.subject || 'n/a'}`,
  `Valid: ${s.tls.validFrom} -> ${s.tls.validTo} (${s.tls.daysRemaining} days remaining)`,
  `Protocol: ${s.tls.protocol || 'n/a'}`,
  `HTTP -> HTTPS redirect: ${s.httpsRedirect === null ? 'HTTP not reachable' : s.httpsRedirect ? 'yes' : 'no'}`,
]) : '_Not checked (plain HTTP target)_'}

### Security Headers
${list(Object.entries(s.securityHeaders).map(([k, v]) => `${k}: ${v ? `\`${v.slice(0, 200)}\`` : 'missing'}`))}

### Exposed Paths
${list(r.exposedFiles.map((f) => `[${f.severity}] ${f.label} - ${f.url}`))}

### Secrets in Client Code
${list(r.secrets.map((x) => `[${x.severity}] ${x.kind}: \`${x.masked}\` (${x.source})`))}

## Tech Stack (${r.techStack.length})
${list(r.techStack.map((t) => `**${t.name}**${t.version ? ` ${t.version}` : ''} - ${t.category} (${t.confidence}%, via ${t.evidence?.join(', ')})`))}

## Endpoints & Data Sources (${r.dataSources.length})
${list(r.dataSources.map((d) => `[${d.type}] ${d.method || 'GET'} ${d.resolvedUrl || d.url} (${d.source})`))}

## DNS & Infrastructure
${list([
  `IP: ${dns.ip || 'unresolved'}${dns.location ? ` - ${dns.location.org} ${dns.location.asn || ''}, ${dns.location.city}, ${dns.location.country}` : ''}`,
  `PTR: ${dns.ptr?.join(', ') || 'n/a'}`,
  `DNS provider: ${dns.providers.dns || 'unknown'} / Email provider: ${dns.providers.email || 'unknown'}`,
  `A: ${dns.records.a.join(', ') || 'none'}`,
  `AAAA: ${dns.records.aaaa.join(', ') || 'none'}`,
  `CNAME: ${dns.records.cname.join(', ') || 'none'}`,
  `NS: ${dns.records.ns.join(', ') || 'none'}`,
  `MX: ${dns.records.mx.join(', ') || 'none'}`,
  `CAA: ${dns.records.caa.join(', ') || 'none'}`,
  `SPF: ${dns.email.spf || 'none'}`,
  `DMARC: ${dns.records.dmarc[0] || 'none'}`,
  `SaaS verifications: ${dns.saasVerifications.join(', ') || 'none'}`,
])}

## Subdomains (${r.subdomainTotal} from Certificate Transparency)
${list(r.subdomains.map((x) => `${x.subdomain}${x.resolves === undefined ? '' : x.resolves ? ` -> ${x.ip}` : ' (no DNS)'}`))}

## History (Wayback Machine)
${list([
  `First archived: ${r.history.firstOnlineDate || 'never'}`,
  `Apex (${r.history.apexDomain}) first archived: ${r.history.apexDomainFirstOnlineDate || 'never'}`,
  `Last archived: ${r.history.lastSeenDate || 'n/a'}`,
  `Total captures: ${r.history.totalSnapshots.toLocaleString()}`,
  ...(years.length ? [`Per year: ${years.map(([y, c]) => `${y}: ${c}`).join(', ')}`] : []),
])}

${r.robots?.disallow.length ? `## robots.txt Disallowed Paths\n${list(r.robots.disallow)}\n` : ''}
## Scan Log
\`\`\`
${r.terminalLogs.join('\n')}
\`\`\`
`;
}
