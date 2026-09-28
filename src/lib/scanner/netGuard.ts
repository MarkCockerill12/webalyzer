import { lookup } from 'node:dns/promises';
import net from 'node:net';

// Webalyzer fetches arbitrary user-supplied URLs server-side (and in a headless browser).
// Without a guard, anyone who can reach the app can make it request internal services
// (cloud metadata at 169.254.169.254, localhost admin panels, the Docker network, ...).
// Set WEBALYZER_ALLOW_PRIVATE=1 to scan local / intranet targets on a trusted machine.
const ALLOW_PRIVATE = process.env.WEBALYZER_ALLOW_PRIVATE === '1';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export class TargetError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const PRIVATE_V4: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const value = ipv4ToInt(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (value & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return lower === '::' || lower === '::1' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  }
  return false;
}

const hostVerdicts = new Map<string, Promise<boolean>>();

/** True when the host resolves only to public addresses (cached per process). */
export function isPublicHost(hostname: string): Promise<boolean> {
  if (ALLOW_PRIVATE) return Promise.resolve(true);
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    return Promise.resolve(false);
  }
  if (net.isIP(host)) return Promise.resolve(!isPrivateIp(host));

  let verdict = hostVerdicts.get(host);
  if (!verdict) {
    verdict = lookup(host, { all: true })
      .then((addrs) => addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address)))
      .catch(() => true); // unresolvable -> the request itself will just fail
    hostVerdicts.set(host, verdict);
    if (hostVerdicts.size > 5000) hostVerdicts.clear();
  }
  return verdict;
}

export async function assertPublicHost(hostname: string): Promise<void> {
  if (!(await isPublicHost(hostname))) {
    throw new TargetError(
      `Refusing to scan ${hostname}: it resolves to a private or reserved address. Set WEBALYZER_ALLOW_PRIVATE=1 to allow local targets.`
    );
  }
}

export interface GuardedResponse {
  response: Response;
  finalUrl: string;
  redirects: string[];
}

/**
 * fetch() that follows redirects manually so every hop is checked against the private-address guard.
 */
export async function guardedFetch(
  url: string,
  init: RequestInit & { maxRedirects?: number } = {}
): Promise<GuardedResponse> {
  const { maxRedirects = 5, ...rest } = init;
  const redirects: string[] = [];
  let current = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHost(new URL(current).hostname);
    const response = await fetch(current, {
      ...rest,
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, ...(rest.headers as Record<string, string>) },
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location && maxRedirects > 0) {
      await response.body?.cancel().catch(() => {});
      current = new URL(location, current).toString();
      redirects.push(current);
      continue;
    }
    return { response, finalUrl: current, redirects };
  }
  throw new Error(`Too many redirects (>${maxRedirects})`);
}

/** Read at most `maxBytes` of a response body as text. */
export async function readTextCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return text.length > maxBytes ? text.slice(0, maxBytes) : text;
}
