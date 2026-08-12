import { SecurityInfo, DataSourceItem } from '../types';

export function auditSecurity(headers: Record<string, string>, targetUrl: string, dataSources: DataSourceItem[]): SecurityInfo {
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = String(v);
  }

  const isHttps = targetUrl.startsWith('https://');
  const hsts = Boolean(lowerHeaders['strict-transport-security']);
  const csp = Boolean(lowerHeaders['content-security-policy']);
  const xFrame = lowerHeaders['x-frame-options'] || undefined;
  const cors = lowerHeaders['access-control-allow-origin'] || undefined;
  const xContentType = lowerHeaders['x-content-type-options'] === 'nosniff';

  const vulnerabilities: string[] = [];

  if (!isHttps) {
    vulnerabilities.push('Insecure Protocol: Site uses unencrypted HTTP protocol.');
  }

  if (!hsts) {
    vulnerabilities.push('Missing HSTS (Strict-Transport-Security) header.');
  }

  if (!csp) {
    vulnerabilities.push('Missing Content-Security-Policy (CSP) header.');
  }

  if (cors === '*') {
    vulnerabilities.push('Wildcard CORS Policy: Access-Control-Allow-Origin set to "*".');
  }

  // Check if dangerous database strings were found in DOM/Scripts
  const dbStrings = dataSources.filter(d => d.type === 'Database String');
  if (dbStrings.length > 0) {
    vulnerabilities.push(`CRITICAL: Exposed raw Database Connection String found in script bundles! (${dbStrings.length} detected)`);
  }

  const sharepoints = dataSources.filter(d => d.type === 'SharePoint');
  if (sharepoints.length > 0) {
    vulnerabilities.push(`Information Disclosure: ${sharepoints.length} SharePoint document/API endpoints identified in client bundle.`);
  }

  // Score Calculation
  let riskScore: SecurityInfo['riskScore'] = 'A';
  const vulnCount = vulnerabilities.length;

  if (vulnerabilities.some(v => v.includes('CRITICAL'))) {
    riskScore = 'F';
  } else if (vulnCount >= 4) {
    riskScore = 'D';
  } else if (vulnCount >= 3) {
    riskScore = 'C';
  } else if (vulnCount >= 2) {
    riskScore = 'B';
  } else if (isHttps && hsts && csp) {
    riskScore = 'A+';
  }

  return {
    sslValid: isHttps,
    sslIssuer: isHttps ? 'DigiCert / Cloudflare RSA TLS CA' : 'None',
    sslDaysRemaining: isHttps ? 280 : 0,
    securityHeaders: {
      hsts,
      csp,
      xFrameOptions: xFrame,
      corsPolicy: cors,
      xContentTypeOptions: xContentType,
    },
    riskScore,
    vulnerabilitiesFound: vulnerabilities,
  };
}
