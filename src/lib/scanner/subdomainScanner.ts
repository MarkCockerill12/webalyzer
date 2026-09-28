import { SubdomainItem } from '../types';
import { mapLimit, safeFetchJson } from '../utils';
import { resolveA } from './dnsScanner';

const MAX_RETURNED = 500;
const MAX_RESOLVED = 40;

function collectNames(rawNames: string[], apex: string, into: Set<string>) {
  for (const raw of rawNames) {
    for (let name of raw.split('\n')) {
      name = name.trim().toLowerCase().replace(/^\*\./, '');
      if (name && !name.includes('*') && name !== apex && name.endsWith(`.${apex}`)) into.add(name);
    }
  }
}

async function fromCrtsh(apex: string): Promise<string[] | null> {
  const url = `https://crt.sh/?q=${encodeURIComponent(`%.${apex}`)}&output=json&exclude=expired&deduplicate=Y`;
  const { ok, data } = await safeFetchJson<any[]>(url, { signal: AbortSignal.timeout(15000) });
  if (!ok || !Array.isArray(data)) return null;
  return data.map((e) => String(e.name_value || ''));
}

async function fromCertspotter(apex: string): Promise<string[] | null> {
  const url = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(apex)}&include_subdomains=true&expand=dns_names`;
  const { ok, data } = await safeFetchJson<any[]>(url, { signal: AbortSignal.timeout(10000) });
  if (!ok || !Array.isArray(data)) return null;
  return data.flatMap((e) => (Array.isArray(e.dns_names) ? e.dns_names : []));
}

/** Certificate Transparency subdomain enumeration with DNS liveness checks on the first batch. */
export async function fetchSubdomains(apex: string, log: (line: string) => void): Promise<{ items: SubdomainItem[]; total: number }> {
  const names = new Set<string>();
  let source = 'crt.sh';

  const crt = await fromCrtsh(apex);
  if (crt) {
    collectNames(crt, apex, names);
  } else {
    log('[OSINT] crt.sh unavailable or timed out - falling back to Cert Spotter.');
    source = 'certspotter';
    const spotter = await fromCertspotter(apex);
    if (spotter) collectNames(spotter, apex, names);
  }

  const sorted = Array.from(names).sort((a, b) => a.split('.').length - b.split('.').length || a.localeCompare(b));
  const items: SubdomainItem[] = sorted.slice(0, MAX_RETURNED).map((subdomain) => ({ subdomain, source }));

  if (items.length > 0) {
    log(`[OSINT] Resolving DNS for ${Math.min(items.length, MAX_RESOLVED)} of ${sorted.length} subdomains...`);
    await mapLimit(items.slice(0, MAX_RESOLVED), 10, async (item) => {
      const ips = await resolveA(item.subdomain);
      item.resolves = ips.length > 0;
      item.ip = ips[0];
    });
    items.sort((a, b) => Number(b.resolves === true) - Number(a.resolves === true));
  }

  return { items, total: sorted.length };
}
