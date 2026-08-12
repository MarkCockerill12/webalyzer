import puppeteer, { Page } from 'puppeteer';

export interface NetworkData {
  endpoints: Set<string>;
  technologies: Set<string>;
  domains: Set<string>;
  networkLogs: string[];
}

export async function runNetworkScanner(url: string, timeoutMs: number = 8000): Promise<NetworkData> {
  const result: NetworkData = {
    endpoints: new Set(),
    technologies: new Set(),
    domains: new Set(),
    networkLogs: []
  };

  let browser;
  try {
    result.networkLogs.push(`[PUPPETEER] Launching headless browser...`);
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    // Intercept network requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const reqUrl = request.url();
      const resourceType = request.resourceType();
      
      try {
        const parsedUrl = new URL(reqUrl);
        result.domains.add(parsedUrl.hostname);
        
        // Specifically look for API endpoints
        if (resourceType === 'xhr' || resourceType === 'fetch' || resourceType === 'websocket') {
          result.endpoints.add(reqUrl);
        }
        
        // Detect CDNs or specific services via URL
        if (parsedUrl.hostname.includes('supabase')) result.technologies.add('Supabase');
        if (parsedUrl.hostname.includes('firebase')) result.technologies.add('Firebase');
        if (parsedUrl.hostname.includes('sharepoint.com')) result.technologies.add('SharePoint');
        if (parsedUrl.hostname.includes('s3.amazonaws')) result.technologies.add('AWS S3');
        if (parsedUrl.hostname.includes('vercel.app')) result.technologies.add('Vercel');
        
      } catch(e) {}
      
      // We don't want to actually load media/images/fonts to save time and bandwidth
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    result.networkLogs.push(`[PUPPETEER] Navigating to ${url}...`);
    
    // Wait until network is mostly idle (2 connections max) or timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs }).catch(() => {
      result.networkLogs.push(`[PUPPETEER] Navigation timeout reached, extracting partial data.`);
    });
    
    result.networkLogs.push(`[PUPPETEER] Captured ${result.endpoints.size} XHR/Fetch endpoints and ${result.domains.size} unique domains.`);
    
  } catch (err: any) {
    result.networkLogs.push(`[PUPPETEER] Error during scan: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return result;
}
