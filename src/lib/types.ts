export type TechCategory =
  | 'Frontend Framework'
  | 'Backend / Language'
  | 'Database'
  | 'CMS / Platform'
  | 'E-commerce'
  | 'Analytics'
  | 'CDN / Hosting'
  | 'Web Server'
  | 'CSS Framework'
  | 'Security / WAF'
  | 'Build Tool / Lib'
  | 'Payments'
  | 'Monitoring'
  | 'Widgets / Services';

export interface TechItem {
  name: string;
  category: TechCategory;
  version?: string;
  confidence: number; // 0-100
  description?: string;
  evidence?: string[]; // which signals matched (header, cookie, js global, html, script)
}

export type DataSourceType =
  | 'SharePoint'
  | 'REST API'
  | 'GraphQL'
  | 'AWS S3 Bucket'
  | 'Azure Blob'
  | 'Firebase'
  | 'Supabase'
  | 'WebSocket'
  | 'Database String'
  | 'Exposed Endpoint'
  | 'AWS API Gateway'
  | 'Microsoft Graph API'
  | 'Azure Functions'
  | 'GCP Cloud Run / Functions'
  | 'Telemetry / Tracking';

export interface DataSourceItem {
  type: DataSourceType;
  url: string; // as found (may be a relative path)
  resolvedUrl?: string; // absolute URL, when it could be resolved
  host?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'WS' | 'UNKNOWN';
  source: string; // e.g. "main-abc123.js" or "Headless browser (XHR)"
  confidence: number;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecretFinding {
  kind: string;
  masked: string;
  severity: Severity;
  source: string;
  note?: string;
}

export interface HistoryInfo {
  firstOnlineDate: string | null; // earliest capture of the exact host
  lastSeenDate?: string | null;
  apexDomainFirstOnlineDate?: string | null;
  apexDomain?: string;
  waybackUrl: string | null;
  totalSnapshots: number;
  yearlySnapshots?: Record<string, number>;
  oldestSnapshotUrl?: string;
}

export interface DnsInfo {
  ip: string | null;
  hostname: string;
  ptr?: string[];
  records: {
    a: string[];
    aaaa: string[];
    cname: string[];
    mx: string[];
    txt: string[];
    ns: string[];
    caa: string[];
    dmarc: string[];
  };
  providers: {
    dns?: string;
    email?: string;
  };
  email: {
    spf: string | null;
    dmarcPolicy: string | null;
  };
  saasVerifications: string[];
  location?: {
    country: string;
    city: string;
    org: string;
    asn?: string;
  };
}

export interface TlsInfo {
  checked: boolean;
  valid: boolean;
  error?: string;
  issuer?: string;
  subject?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  protocol?: string;
  altNames?: string[];
}

export interface CookieInfo {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
}

export interface SecurityFinding {
  severity: Severity;
  title: string;
  detail?: string;
}

export interface SecurityInfo {
  tls: TlsInfo;
  httpsRedirect: boolean | null;
  securityHeaders: {
    hsts?: string;
    csp?: string;
    xFrameOptions?: string;
    xContentTypeOptions?: string;
    referrerPolicy?: string;
    permissionsPolicy?: string;
    corsPolicy?: string;
    server?: string;
    poweredBy?: string;
  };
  cookies: CookieInfo[];
  score: number; // 0-100
  riskScore: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: SecurityFinding[];
}

export interface ExposedFile {
  path: string;
  url: string;
  label: string;
  severity: Severity;
  status: number;
}

export interface RobotsInfo {
  disallow: string[];
  sitemaps: string[];
}

export interface SubdomainItem {
  subdomain: string;
  resolves?: boolean; // undefined = not checked
  ip?: string;
  source: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'domain' | 'tech' | 'api' | 'datasource' | 'server' | 'security';
  color: string;
  icon?: string;
  detail?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface AnalysisResult {
  targetUrl: string;
  finalUrl: string;
  httpStatus: number | null;
  domain: string;
  analyzedAt: string;
  executionTimeMs: number;
  techStack: TechItem[];
  dataSources: DataSourceItem[];
  secrets: SecretFinding[];
  history: HistoryInfo;
  dns: DnsInfo;
  security: SecurityInfo;
  exposedFiles: ExposedFile[];
  robots?: RobotsInfo;
  subdomains: SubdomainItem[];
  subdomainTotal: number;
  graphData: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  terminalLogs: string[];
}

/** One line of the NDJSON stream emitted by POST /api/analyze */
export type ScanStreamMessage =
  | { type: 'log'; line: string }
  | { type: 'result'; data: AnalysisResult }
  | { type: 'error'; error: string };
