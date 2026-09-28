import puppeteer, { Browser } from 'puppeteer';
import { buildJsProbeExpression } from './techSignatures';
import { isPublicHost, USER_AGENT } from './netGuard';

export interface CapturedRequest {
  url: string;
  method: string;
  resourceType: string;
}

export interface NetworkData {
  ok: boolean;
  requests: CapturedRequest[]; // xhr / fetch / websocket / eventsource
  domains: string[];
  scripts: { url: string; body: string }[];
  renderedHtml: string;
  documentHeaders: Record<string, string>;
  documentStatus: number | null;
  finalUrl: string | null;
  cookies: { name: string; domain: string; secure: boolean; httpOnly: boolean; sameSite?: string }[];
  jsGlobals: Record<string, string | true>;
}

const MAX_SCRIPTS = 15;
const MAX_SCRIPT_BYTES = 2_000_000;
const JS_PROBE = buildJsProbeExpression();

export async function runNetworkScanner(url: string, log: (line: string) => void, timeoutMs = 12000): Promise<NetworkData> {
  const result: NetworkData = {
    ok: false,
    requests: [],
    domains: [],
    scripts: [],
    renderedHtml: '',
    documentHeaders: {},
    documentStatus: null,
    finalUrl: null,
    cookies: [],
    jsGlobals: {},
  };

  const domains = new Set<string>();
  const pendingScripts: Promise<void>[] = [];
  let browser: Browser | undefined;

  try {
    log('[BROWSER] Launching headless Chromium...');
    browser = await puppeteer.launch({
      headless: true,
      // No --single-process: it detaches frames mid-navigation ("Navigating frame was detached") on most real sites.
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1366, height: 900 });
    await page.setRequestInterception(true);

    page.on('request', async (request) => {
      if (request.isInterceptResolutionHandled()) return;
      const reqUrl = request.url();
      const type = request.resourceType();

      let hostname = '';
      try {
        hostname = new URL(reqUrl).hostname;
      } catch {}

      if (reqUrl.startsWith('http') && hostname && !(await isPublicHost(hostname))) {
        log(`[BROWSER] Blocked request to private address: ${hostname}`);
        return request.abort('blockedbyclient').catch(() => {});
      }
      if (hostname) domains.add(hostname);

      if (['xhr', 'fetch', 'websocket', 'eventsource'].includes(type)) {
        result.requests.push({ url: reqUrl, method: request.method(), resourceType: type });
      }

      // Skip heavy assets that carry no recon signal
      if (['image', 'media', 'font'].includes(type)) return request.abort().catch(() => {});
      return request.continue().catch(() => {});
    });

    page.on('response', (response) => {
      const req = response.request();
      if (req.resourceType() !== 'script' || pendingScripts.length >= MAX_SCRIPTS) return;
      pendingScripts.push(
        response
          .text()
          .then((body) => {
            if (body.length <= MAX_SCRIPT_BYTES) result.scripts.push({ url: response.url(), body });
          })
          .catch(() => {})
      );
    });

    log(`[BROWSER] Navigating to ${url} and waiting for network idle...`);
    const mainResponse = await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs }).catch((err) => {
      log(`[BROWSER] Navigation incomplete (${err?.message || 'timeout'}) - extracting partial data.`);
      return null;
    });

    if (mainResponse) {
      result.documentStatus = mainResponse.status();
      result.documentHeaders = mainResponse.headers();
    }
    result.finalUrl = page.url();
    result.renderedHtml = await page.content().catch(() => '');
    result.jsGlobals = ((await page.evaluate(JS_PROBE).catch(() => ({}))) || {}) as Record<string, string | true>;
    result.cookies = (await browser.cookies().catch(() => [])).map((c) => ({
      name: c.name,
      domain: c.domain.replace(/^\./, ''),
      secure: c.secure,
      httpOnly: Boolean(c.httpOnly),
      sameSite: c.sameSite,
    }));

    await Promise.race([Promise.all(pendingScripts), new Promise((r) => setTimeout(r, 2000))]);
    result.domains = Array.from(domains);
    result.ok = true;

    log(
      `[BROWSER] Rendered ${result.renderedHtml.length} bytes, captured ${result.requests.length} XHR/fetch/WS calls, ` +
        `${result.scripts.length} script bodies, ${Object.keys(result.jsGlobals).length} JS runtime signatures, ${domains.size} contacted domains.`
    );
  } catch (err: any) {
    log(`[BROWSER] Headless scan failed: ${err?.message || err}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return result;
}
