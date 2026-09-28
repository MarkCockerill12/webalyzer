import { AnalysisResult, DataSourceItem, GraphLink, GraphNode } from '../types';

const TYPE_COLORS: Partial<Record<DataSourceItem['type'], string>> = {
  SharePoint: '#0078d4',
  'AWS S3 Bucket': '#ff9900',
  'AWS API Gateway': '#ff9900',
  'Database String': '#d32f2f',
  Firebase: '#ffa000',
  Supabase: '#3ecf8e',
  GraphQL: '#e535ab',
  WebSocket: '#6a1b9a',
  'Telemetry / Tracking': '#78909c',
};

const MAX_TECH_NODES = 14;
const MAX_HOST_NODES = 18;

type GraphInput = Pick<AnalysisResult, 'domain' | 'dns' | 'techStack' | 'dataSources'>;

export function buildGraph({ domain, dns, techStack, dataSources }: GraphInput): AnalysisResult['graphData'] {
  const nodes: GraphNode[] = [{ id: 'target', label: domain, type: 'domain', color: '#0058ee', detail: domain }];
  const links: GraphLink[] = [];

  if (dns.ip) {
    const where = dns.location ? `${dns.location.org} - ${dns.location.city}, ${dns.location.country}` : 'Location unknown';
    nodes.push({ id: 'ip_server', label: dns.ip, type: 'server', color: '#2e7d32', detail: where });
    links.push({ source: 'target', target: 'ip_server', label: 'Hosted on' });
  }
  if (dns.providers.dns) {
    nodes.push({ id: 'dns_provider', label: dns.providers.dns, type: 'server', color: '#00897b', detail: `Nameservers: ${dns.records.ns.join(', ')}` });
    links.push({ source: 'target', target: 'dns_provider', label: 'DNS' });
  }
  if (dns.providers.email) {
    nodes.push({ id: 'mail_provider', label: dns.providers.email, type: 'server', color: '#5e35b1', detail: `MX: ${dns.records.mx.join(', ')}` });
    links.push({ source: 'target', target: 'mail_provider', label: 'Email' });
  }

  techStack.slice(0, MAX_TECH_NODES).forEach((t, i) => {
    nodes.push({
      id: `tech_${i}`,
      label: t.version ? `${t.name} ${t.version}` : t.name,
      type: 'tech',
      color: '#8e24aa',
      detail: `${t.category} - ${t.confidence}% confidence`,
    });
    links.push({ source: 'target', target: `tech_${i}`, label: 'Uses' });
  });

  // One node per backend host rather than per URL, so large apps stay readable
  const byHost = new Map<string, DataSourceItem[]>();
  for (const ds of dataSources) {
    const host = ds.type === 'Database String' ? 'database' : ds.host || domain;
    byHost.set(host, [...(byHost.get(host) || []), ds]);
  }
  Array.from(byHost.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_HOST_NODES)
    .forEach(([host, items], i) => {
      const types = Array.from(new Set(items.map((d) => d.type)));
      const id = `host_${i}`;
      nodes.push({
        id,
        label: host === domain ? `${host} (same-origin)` : host,
        type: 'datasource',
        color: TYPE_COLORS[types[0]] || '#0288d1',
        detail: `${items.length} endpoint(s): ${types.join(', ')}`,
      });
      links.push({ source: 'target', target: id, label: types[0] });
    });

  return { nodes, links };
}
