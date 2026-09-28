'use client';

import React from 'react';
import { HistoryInfo } from '@/lib/types';
import { Calendar, History, ExternalLink, Archive, Globe } from 'lucide-react';

interface WaybackTimelineProps {
  history: HistoryInfo;
  domain: string;
}

function StatBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="y2k-inset-box flex items-center gap-3 p-3 min-w-0">
      <div className="p-2.5 bg-[var(--chrome-light)] border border-[var(--shadow)] text-[var(--text-main)] rounded-lg shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-[var(--text-main)] font-black uppercase tracking-wider">{label}</div>
        <div className="text-base font-black font-mono text-[var(--text-main)]">{value}</div>
        <div className="text-[10px] text-[var(--text-muted)] font-bold truncate">{sub}</div>
      </div>
    </div>
  );
}

export function WaybackTimeline({ history, domain }: WaybackTimelineProps) {
  const apexDom = history.apexDomain || domain;
  const years = Object.entries(history.yearlySnapshots || {}).sort(([a], [b]) => Number(a) - Number(b));
  const max = Math.max(1, ...years.map(([, c]) => c));

  if (!history.firstOnlineDate && !history.apexDomainFirstOnlineDate) {
    return (
      <div className="y2k-inset-box p-6 text-center font-mono text-xs text-slate-700">
        The Internet Archive has no captures for {domain}
        {apexDom !== domain ? ` or ${apexDom}` : ''} (or the Wayback API did not respond).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b-2 border-[var(--shadow)] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded-lg text-[var(--text-main)]">
            <History size={18} />
          </span>
          <div>
            <div className="font-extrabold text-sm text-[var(--text-main)] font-mono">Wayback Machine Timeline</div>
            <div className="text-[11px] text-slate-700">
              Host <span className="font-mono text-blue-900 font-bold">{domain}</span>
              {apexDom !== domain && (
                <>
                  {' '}and root domain <span className="font-mono text-blue-900 font-bold">{apexDom}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {history.waybackUrl && (
          <a href={history.waybackUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 y2k-button text-xs font-black flex items-center gap-1.5">
            <ExternalLink size={12} />
            <span>Open Wayback</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox icon={<Calendar size={20} />} label="Root Domain First Seen" value={history.apexDomainFirstOnlineDate || 'Never'} sub={apexDom} />
        <StatBox icon={<Globe size={20} />} label="Host First Seen" value={history.firstOnlineDate || 'Never'} sub={domain} />
        <StatBox icon={<History size={20} />} label="Last Captured" value={history.lastSeenDate || 'n/a'} sub="Most recent snapshot" />
        <StatBox icon={<Archive size={20} />} label="Total Captures" value={history.totalSnapshots.toLocaleString()} sub="Archive.org index (host)" />
      </div>

      {years.length > 0 && (
        <div className="y2k-inset-box p-3 space-y-2">
          <div className="text-[10px] font-black font-mono uppercase text-[var(--text-main)]">Captures per year</div>
          <div className="flex items-end gap-[3px] h-32">
            {years.map(([year, count]) => (
              <a
                key={year}
                href={`https://web.archive.org/web/${year}0101000000*/${domain}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[6px] bg-[#0058ee] hover:bg-[#3593ff] border border-[#003a9e] rounded-t-sm"
                style={{ height: `${Math.max(2, (count / max) * 100)}%` }}
                title={`${year}: ${count.toLocaleString()} captures`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--text-muted)]">
            <span>{years[0][0]}</span>
            <span>{years[years.length - 1][0]}</span>
          </div>
        </div>
      )}

      {history.oldestSnapshotUrl && (
        <div className="text-xs y2k-inset-box p-2.5 flex items-center justify-between font-mono">
          <span className="text-[var(--text-main)] font-bold text-[11px] truncate">Earliest snapshot: {history.oldestSnapshotUrl}</span>
          <a href={history.oldestSnapshotUrl} target="_blank" rel="noreferrer" className="text-blue-900 hover:underline font-black whitespace-nowrap text-[11px] ml-2">
            View Snapshot
          </a>
        </div>
      )}
    </div>
  );
}
