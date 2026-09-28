import { DataSourceItem, DataSourceType } from '../types';

export interface ContentSource {
  label: string; // "HTML" or a script file name
  content: string;
}

const TRACKING_HOSTS =
  /(?:^|\.)(?:google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|googlesyndication\.com|googleadservices\.com|facebook\.net|hotjar\.(?:com|io)|clarity\.ms|segment\.(?:io|com)|mixpanel\.com|amplitude\.com|sentry\.io|datadoghq\.(?:com|eu)|newrelic\.com|nr-data\.net|bat\.bing\.com|px\.ads\.linkedin\.com|snap\.licdn\.com|analytics\.tiktok\.com|cloudflareinsights\.com|posthog\.com|plausible\.io|hubspot\.com|hs-analytics\.net|intercom\.io|lr-ingest\.io|fullstory\.com|quantserve\.com|scorecardresearch\.com|adnxs\.com|criteo\.com|taboola\.com|outbrain\.com)$/i;

// Hosts that appear in library code / comments rather than as real backends
const NOISE_HOSTS =
  /(?:^|\.)(?:w3\.org|schema\.org|xmlns\.com|purl\.org|ogp\.me|reactjs\.org|react\.dev|nextjs\.org|vuejs\.org|angular\.io|svelte\.dev|babeljs\.io|webpack\.js\.org|developer\.mozilla\.org|mozilla\.org|github\.com|githubusercontent\.com|npmjs\.(?:com|org)|jquery\.com|fb\.me|example\.(?:com|org|net)|localhost|stackoverflow\.com|wikipedia\.org|tc39\.es|whatwg\.org|json-schema\.org|feross\.org|polyfill\.io|lodash\.com|momentjs\.com|sentry-cdn\.com)$/i;

const STATIC_ASSET = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|map|js|mjs|txt|pdf)(?:[?#]|$)/i;
const API_HINT = /(?:^|\/)(?:api|apis|v\d+(?:\.\d+)?|graphql|gql|rest|rpc|_api|wp-json|odata|services?|ajax|query|rpc)(?:\/|$|\?)|\.(?:json|php|aspx|asmx|ashx)(?:\?|$)/i;

export function classifyEndpoint(url: string): DataSourceType {
  const lower = url.toLowerCase();
  let host = '';
  let path = lower;
  try {
    const parsed = new URL(url, 'https://placeholder.invalid');
    host = parsed.hostname === 'placeholder.invalid' ? '' : parsed.hostname;
    path = parsed.pathname;
  } catch {}

  if (/^wss?:/.test(lower)) return 'WebSocket';
  if (host.endsWith('.sharepoint.com') || path.includes('/_api/web') || path.includes('_layouts/15/')) return 'SharePoint';
  if (/\.execute-api\.[a-z0-9-]+\.amazonaws\.com$/.test(host)) return 'AWS API Gateway';
  if (/(?:^|\.)s3[.-](?:[a-z0-9-]+\.)?amazonaws\.com$/.test(host) || host === 's3.amazonaws.com' || host.endsWith('.s3.amazonaws.com')) return 'AWS S3 Bucket';
  if (host.endsWith('.blob.core.windows.net')) return 'Azure Blob';
  if (host === 'graph.microsoft.com') return 'Microsoft Graph API';
  if (host.endsWith('.azurewebsites.net') && path.startsWith('/api')) return 'Azure Functions';
  if (host.endsWith('.cloudfunctions.net') || host.endsWith('.run.app')) return 'GCP Cloud Run / Functions';
  if (/(?:firebaseio\.com|firebaseapp\.com|firestore\.googleapis\.com|firebasestorage\.googleapis\.com)$/.test(host)) return 'Firebase';
  if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) return 'Supabase';
  if (TRACKING_HOSTS.test(host) || (host.endsWith('facebook.com') && path === '/tr') || path.includes('/_vercel/insights') || path.includes('/cdn-cgi/rum')) {
    return 'Telemetry / Tracking';
  }
  if (/\/graphql\b|\/gql\b/.test(path)) return 'GraphQL';
  return 'REST API';
}

function cleanMatch(raw: string): string {
  let url = raw.split('${')[0].split('#{')[0];
  url = url.replace(/[\\,;.)}\]`]+$/, '');
  return url;
}

function maskDbCredentials(conn: string): string {
  return conn.replace(/(:\/\/[^:/@\s]+):([^@/\s]+)@/, '$1:****@');
}

export function extractDataSources(sources: ContentSource[], baseUrl: string): DataSourceItem[] {
  const results: DataSourceItem[] = [];
  const seen = new Set<string>();
  const add = (rawUrl: string, sourceLabel: string, method?: DataSourceItem['method'], forceType?: DataSourceType) => {
    const url = cleanMatch(rawUrl);
    if (url.length < 4 || url.length > 400) return;

    let resolvedUrl: string | undefined;
    let host: string | undefined;
    try {
      const parsed = new URL(url, baseUrl);
      resolvedUrl = parsed.toString();
      host = parsed.hostname;
    } catch {}

    const type = forceType || classifyEndpoint(resolvedUrl || url);
    const key = `${type}|${(resolvedUrl || url).replace(/\/$/, '')}`;
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      type,
      url: forceType === 'Database String' ? maskDbCredentials(url) : url,
      resolvedUrl: forceType === 'Database String' ? undefined : resolvedUrl,
      host,
      method: method || (type === 'GraphQL' || type === 'Supabase' ? 'POST' : type === 'WebSocket' ? 'WS' : 'GET'),
      source: sourceLabel,
      confidence: url.startsWith('http') || url.startsWith('ws') ? 90 : 75,
    });
  };

  for (const { label, content } of sources) {
    if (!content) continue;
    let m: RegExpExecArray | null;

    // 1. Explicit client calls - fetch('/x'), axios.post('/x'), $.get('/x'), http.delete('/x')
    const callRegex = /\b(?:fetch|axios(?:\.(get|post|put|patch|delete))?|\$\.(get|post|ajax)|\.(get|post|put|patch|delete))\(\s*["'`]((?:https?:\/\/|\/)[^"'`\s<>]+)["'`]/gi;
    while ((m = callRegex.exec(content)) !== null) {
      const verb = (m[1] || m[2] || m[3] || '').toUpperCase();
      const method = (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(verb) ? verb : undefined) as DataSourceItem['method'];
      if (m[4].length > 1 && !STATIC_ASSET.test(m[4])) add(m[4], label, method);
    }

    // 2. Absolute URLs (http/https/ws/wss)
    const absRegex = /\b(?:https?|wss?):\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s"'<>`\\)]*)?/g;
    while ((m = absRegex.exec(content)) !== null) {
      const raw = cleanMatch(m[0]);
      let host = '';
      let path = '';
      try {
        const parsed = new URL(raw);
        host = parsed.hostname;
        path = parsed.pathname + parsed.search;
      } catch {
        continue;
      }
      if (NOISE_HOSTS.test(host)) continue;
      const type = classifyEndpoint(raw);
      if (type === 'REST API') {
        // Generic URL: only keep it when it looks like an API rather than a page or asset
        if (STATIC_ASSET.test(path)) continue;
        if (!(host.startsWith('api.') || host.startsWith('api-') || API_HINT.test(path))) continue;
        if (/\/(?:manifest|package|tsconfig|composer)\.json/i.test(path)) continue;
      }
      // Tracker SDK URLs in static code are covered by tech detection; real beacons come from the headless browser
      if (type === 'Telemetry / Tracking') continue;
      add(raw, label);
    }

    // 3. Relative API routes inside string literals
    const relRegex = /["'`](\/(?:api|apis|v\d+|graphql|gql|rest|rpc|_api|wp-json|odata)(?:\/[^"'`\s<>]*)?)["'`]/gi;
    while ((m = relRegex.exec(content)) !== null) {
      if (!STATIC_ASSET.test(m[1])) add(m[1], label);
    }

    // 4. SharePoint relative endpoints
    const spRegex = /(\/_api\/(?:web|lists|search|sp\.)[^\s"'<>`)]*|\/_layouts\/15\/[^\s"'<>`)]+)/gi;
    while ((m = spRegex.exec(content)) !== null) {
      add(m[1], label, 'GET', 'SharePoint');
    }

    // 5. Database connection strings
    const dbRegex = /\b((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|mariadb|rediss?|amqps?|mssql|sqlserver):\/\/[^\s"'<>`]{3,})/gi;
    while ((m = dbRegex.exec(content)) !== null) {
      add(m[1], label, 'UNKNOWN', 'Database String');
    }

    if (results.length >= 400) break;
  }

  return results;
}

/** True when a database connection string still contains an inline password. */
export function hasInlineCredentials(conn: string): boolean {
  return /:\/\/[^:/@\s]+:\*\*\*\*@/.test(conn);
}
