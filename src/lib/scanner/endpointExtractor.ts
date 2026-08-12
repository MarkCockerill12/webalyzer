import { DataSourceItem } from '../types';

export function extractDataSources(html: string, scriptContents: string[], baseUrl: string): DataSourceItem[] {
  const sources: DataSourceItem[] = [];
  const combined = [html, ...scriptContents].join('\n');
  const seenUrls = new Set<string>();

  function addSource(type: DataSourceItem['type'], url: string, sourceLoc: string, method: DataSourceItem['method'] = 'GET') {
    const cleanUrl = url.trim();
    if (cleanUrl.length < 5 || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    sources.push({
      type,
      url: cleanUrl,
      method,
      source: sourceLoc,
      confidence: cleanUrl.startsWith('http') ? 95 : 80,
    });
  }

  // 1. SharePoint links & APIs
  const sharepointRegex = /(https?:\/\/[a-zA-Z0-9\-_.]+\.sharepoint\.com[^\s"'<>)]*|\/_api\/web\/[^\s"'<>)]*|_layouts\/15\/[^\s"'<>)]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = sharepointRegex.exec(combined)) !== null) {
    addSource('SharePoint', match[1], 'Script / HTML DOM', 'GET');
  }

  // 2. AWS S3 Buckets & Cloud Storage
  const s3Regex = /(https?:\/\/[a-zA-Z0-9.\-_]+\.s3[a-zA-Z0-9.\-_]*\.amazonaws\.com[^\s"'<>)]*|https?:\/\/s3\.amazonaws\.com\/[a-zA-Z0-9.\-_]+[^\s"'<>)]*)/gi;
  while ((match = s3Regex.exec(combined)) !== null) {
    addSource('AWS S3 Bucket', match[1], 'Asset bundle', 'GET');
  }

  const azureBlobRegex = /(https?:\/\/[a-zA-Z0-9.\-_]+\.blob\.core\.windows\.net[^\s"'<>)]*)/gi;
  while ((match = azureBlobRegex.exec(combined)) !== null) {
    addSource('Azure Blob', match[1], 'Asset bundle', 'GET');
  }

  // 3. Firebase & Supabase links
  const firebaseRegex = /(https?:\/\/[a-zA-Z0-9.\-_]+\.(firebaseio\.com|firebaseapp\.com)[^\s"'<>)]*)/gi;
  while ((match = firebaseRegex.exec(combined)) !== null) {
    addSource('Firebase', match[1], 'Firebase config string', 'GET');
  }

  const supabaseRegex = /(https?:\/\/[a-zA-Z0-9.\-_]+\.supabase\.co[^\s"'<>)]*)/gi;
  while ((match = supabaseRegex.exec(combined)) !== null) {
    addSource('Supabase', match[1], 'Supabase client init', 'POST');
  }

  // 4. GraphQL Endpoints
  const graphqlRegex = /(https?:\/\/[^\s"'<>)]*\/graphql|\/graphql|\/api\/graphql)/gi;
  while ((match = graphqlRegex.exec(combined)) !== null) {
    addSource('GraphQL', match[1], 'JS fetch/axios client', 'POST');
  }

  // 5. REST API Endpoints & Routes
  const apiRouteRegex = /(https?:\/\/api\.[a-zA-Z0-9.\-_]+\/[^\s"'<>)]*|["'](\/api\/v[0-9]+\/[a-zA-Z0-9.\-_/]+)["']|["'](\/api\/[a-zA-Z0-9.\-_/]+)["'])/gi;
  while ((match = apiRouteRegex.exec(combined)) !== null) {
    const rawMatch = match[1] || match[2] || match[3];
    if (rawMatch && !rawMatch.endsWith('.js') && !rawMatch.endsWith('.css')) {
      addSource('REST API', rawMatch, 'JS router bundle', 'GET');
    }
  }

  // 6. WebSockets
  const wsRegex = /((wss?:\/\/[a-zA-Z0-9.\-_:]+\/[^\s"'<>)]*))/gi;
  while ((match = wsRegex.exec(combined)) !== null) {
    addSource('WebSocket', match[1], 'Socket connection string', 'WS');
  }

  // 7. Database Strings (if exposed in JS config or comments)
  const dbRegex = /((mongodb(\+srv)?|postgres(ql)?|mysql|redis|amqp):\/\/[^\s"'<>]+)/gi;
  while ((match = dbRegex.exec(combined)) !== null) {
    addSource('Database String', match[1], 'Exposed connection string (Security Flag!)', 'GET');
  }

  return sources;
}
