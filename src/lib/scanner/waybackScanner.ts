import { HistoryInfo } from '../types';
import { getApexDomain, safeFetchJson } from '../utils';

const UA = { 'User-Agent': 'Webalyzer/3.0 (OSINT recon; +https://web.archive.org)' };

function tsToDate(ts: string | undefined | null): string | null {
  if (!ts || ts.length < 8) return null;
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}

interface Sparkline {
  first: string | null;
  last: string | null;
  firstTs: string | null;
  years: Record<string, number>;
}

/** The (undocumented but stable) endpoint that powers the Wayback Machine calendar UI. */
async function querySparkline(host: string): Promise<Sparkline | null> {
  const url = `https://web.archive.org/__wb/sparkline?output=json&url=${encodeURIComponent(host)}&collapse=timestamp:4`;
  const { ok, data } = await safeFetchJson<any>(url, { headers: UA, signal: AbortSignal.timeout(9000) });
  if (!ok || !data || !data.first_ts) return null;

  const years: Record<string, number> = {};
  for (const [year, months] of Object.entries<number[]>(data.years || {})) {
    years[year] = Array.isArray(months) ? months.reduce((a, b) => a + b, 0) : 0;
  }
  return { first: tsToDate(data.first_ts), last: tsToDate(data.last_ts), firstTs: data.first_ts, years };
}

async function queryCdxEarliest(host: string): Promise<string | null> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&output=json&fl=timestamp&limit=1`;
  const { ok, data } = await safeFetchJson<any[]>(url, { headers: UA, signal: AbortSignal.timeout(8000) });
  if (ok && Array.isArray(data) && data.length > 1) return tsToDate(data[1][0]);
  return null;
}

export async function fetchWaybackHistory(hostname: string): Promise<HistoryInfo> {
  const host = hostname.toLowerCase();
  const apexDomain = getApexDomain(host);

  const result: HistoryInfo = {
    firstOnlineDate: null,
    lastSeenDate: null,
    apexDomain,
    apexDomainFirstOnlineDate: null,
    waybackUrl: `https://web.archive.org/web/*/${host}`,
    totalSnapshots: 0,
  };

  try {
    const [hostSpark, apexSpark] = await Promise.all([
      querySparkline(host),
      apexDomain !== host ? querySparkline(apexDomain) : Promise.resolve(null),
    ]);

    if (hostSpark) {
      result.firstOnlineDate = hostSpark.first;
      result.lastSeenDate = hostSpark.last;
      result.yearlySnapshots = hostSpark.years;
      result.totalSnapshots = Object.values(hostSpark.years).reduce((a, b) => a + b, 0);
      result.oldestSnapshotUrl = `https://web.archive.org/web/${hostSpark.firstTs}/${host}`;
    } else {
      result.firstOnlineDate = await queryCdxEarliest(host);
      if (result.firstOnlineDate) {
        result.oldestSnapshotUrl = `https://web.archive.org/web/${result.firstOnlineDate.replace(/-/g, '')}/${host}`;
      }
    }

    result.apexDomainFirstOnlineDate = apexDomain === host ? result.firstOnlineDate : apexSpark?.first || (await queryCdxEarliest(apexDomain));
  } catch (err) {
    console.error('Wayback scanner error:', err);
  }

  return result;
}
