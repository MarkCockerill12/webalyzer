export interface TechItem {
  name: string;
  category: 'Frontend Framework' | 'Backend / Language' | 'Database' | 'CMS / Platform' | 'Analytics' | 'CDN / Hosting' | 'CSS Framework' | 'Security / WAF' | 'Build Tool / Lib';
  version?: string;
  confidence: number; // 0-100
  icon?: string;
  description?: string;
}

export interface DataSourceItem {
  type: 'SharePoint' | 'REST API' | 'GraphQL' | 'AWS S3 Bucket' | 'Azure Blob' | 'Firebase' | 'Supabase' | 'WebSocket' | 'Database String' | 'Exposed Endpoint' | 'AWS API Gateway' | 'Microsoft Graph API' | 'Azure Functions' | 'GCP Cloud Run / Functions';
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS' | 'UNKNOWN';
  source: string; // e.g. "bundle.js L1420"
  confidence: number;
}

export interface HistoryInfo {
  firstOnlineDate: string | null;
  apexDomainFirstOnlineDate?: string | null;
  apexDomain?: string;
  waybackUrl: string | null;
  totalSnapshots: number;
  firstCapturedTitle?: string;
  oldestSnapshotUrl?: string;
}

export interface DnsInfo {
  ip: string;
  hostname: string;
  records: {
    a: string[];
    aaaa: string[];
    mx: string[];
    txt: string[];
    ns: string[];
    cname: string[];
  };
  serverHeader?: string;
  location?: {
    country: string;
    city: string;
    org: string;
  };
}

export interface SecurityInfo {
  sslValid: boolean;
  sslIssuer?: string;
  sslDaysRemaining?: number;
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xFrameOptions?: string;
    corsPolicy?: string;
    xContentTypeOptions: boolean;
  };
  riskScore: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  vulnerabilitiesFound: string[];
}

export interface SubdomainItem {
  subdomain: string;
  status: number | string;
  title?: string;
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
  domain: string;
  analyzedAt: string;
  executionTimeMs: number;
  techStack: TechItem[];
  dataSources: DataSourceItem[];
  history: HistoryInfo;
  dns: DnsInfo;
  security: SecurityInfo;
  subdomains: SubdomainItem[];
  graphData: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  terminalLogs: string[];
  rawHtmlSnippet?: string;
}
