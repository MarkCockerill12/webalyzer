export async function safeFetchJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data: T | null; status: number; text: string }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    const cleanText = text.trim();

    if (cleanText.startsWith('<')) {
      return { ok: false, data: null, status: res.status, text: cleanText };
    }

    try {
      const data = JSON.parse(cleanText);
      return { ok: res.ok, data, status: res.status, text: cleanText };
    } catch {
      return { ok: false, data: null, status: res.status, text: cleanText };
    }
  } catch (err: any) {
    return { ok: false, data: null, status: 0, text: err?.message || 'Network error' };
  }
}

// Second-level labels that sit under a ccTLD (example.co.uk, example.com.au, ...)
const SECOND_LEVEL_LABELS = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'ltd', 'plc', 'nhs', 'or', 'ne', 'go']);

export function getApexDomain(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
  const parts = clean.split('.');
  if (parts.length <= 2) return clean;
  const tld = parts[parts.length - 1];
  if (tld.length === 2 && SECOND_LEVEL_LABELS.has(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
}

/** Run async tasks with a concurrency cap, preserving input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}
