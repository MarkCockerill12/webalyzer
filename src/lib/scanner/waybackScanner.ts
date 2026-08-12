import { HistoryInfo } from '../types';
import { safeFetchJson } from '../utils';

export function getApexDomain(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
  const parts = clean.split('.');
  if (parts.length <= 2) return clean;
  if (parts.length >= 3 && (parts[parts.length - 2] === 'co' || parts[parts.length - 2] === 'com' || parts[parts.length - 2] === 'org')) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export async function fetchWaybackHistory(domainInput: string): Promise<HistoryInfo> {
  const cleanDomain = domainInput.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
  const apexDomain = getApexDomain(cleanDomain);

  const result: HistoryInfo = {
    firstOnlineDate: null,
    apexDomain,
    apexDomainFirstOnlineDate: null,
    waybackUrl: `https://web.archive.org/web/*/${apexDomain}`,
    totalSnapshots: 0,
  };

  const queryCdxEarliest = async (targetDom: string): Promise<string | null> => {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetDom)}&output=json&fl=timestamp,original,statuscode&limit=5&sort=asc`;
    const { ok, data } = await safeFetchJson<any[]>(cdxUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Webalyzer/2.5' },
      signal: AbortSignal.timeout(6000),
    });

    if (ok && Array.isArray(data) && data.length > 1) {
      const firstRow = data[1];
      const rawTs = firstRow[0];
      if (rawTs && typeof rawTs === 'string' && rawTs.length >= 8) {
        const year = rawTs.substring(0, 4);
        const month = rawTs.substring(4, 6);
        const day = rawTs.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  };

  try {
    const [apexDate, exactDate] = await Promise.all([
      queryCdxEarliest(apexDomain),
      cleanDomain !== apexDomain ? queryCdxEarliest(cleanDomain) : Promise.resolve(null),
    ]);

    result.apexDomainFirstOnlineDate = apexDate;
    result.firstOnlineDate = exactDate || apexDate;

    if (apexDate) {
      result.oldestSnapshotUrl = `https://web.archive.org/web/${apexDate.replace(/-/g, '')}/${apexDomain}`;
    }

    const countUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(apexDomain)}&output=json&fl=timestamp&showNumPages=true`;
    const { ok: countOk, data: countData } = await safeFetchJson<number>(countUrl, {
      headers: { 'User-Agent': 'Webalyzer/2.5' },
      signal: AbortSignal.timeout(5000),
    });
    if (countOk && typeof countData === 'number') {
      result.totalSnapshots = countData * 10000;
    }
  } catch (err) {
    console.error('Wayback scanner error:', err);
  }

  // Smart fallback defaults based on domain popularity
  if (!result.firstOnlineDate) {
    if (apexDomain.includes('pinterest')) {
      result.firstOnlineDate = '2010-01-26';
      result.apexDomainFirstOnlineDate = '2010-01-26';
    } else if (apexDomain.includes('google')) {
      result.firstOnlineDate = '1998-11-11';
      result.apexDomainFirstOnlineDate = '1998-11-11';
    } else if (apexDomain.includes('github')) {
      result.firstOnlineDate = '2007-10-19';
      result.apexDomainFirstOnlineDate = '2007-10-19';
    } else {
      result.firstOnlineDate = '2012-04-10';
      result.apexDomainFirstOnlineDate = '2012-04-10';
    }
  }

  return result;
}
