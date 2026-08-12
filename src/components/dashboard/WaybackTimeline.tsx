'use client';

import React from 'react';
import { HistoryInfo } from '@/lib/types';
import { Calendar, History, ExternalLink, ShieldCheck, Globe } from 'lucide-react';

interface WaybackTimelineProps {
  history: HistoryInfo;
  domain: string;
}

export function WaybackTimeline({ history, domain }: WaybackTimelineProps) {
  const rootOnlineDate = history.apexDomainFirstOnlineDate || history.firstOnlineDate || '2010-01-26';
  const rootYear = rootOnlineDate.split('-')[0] || '2010';
  const apexDom = history.apexDomain || domain;

  return (
    <div className="y2k-window p-4 space-y-4">
      <div className="flex items-center justify-between border-b-2 border-[var(--shadow)] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded-lg text-[var(--text-main)]">
            <History size={18} />
          </span>
          <div>
            <div className="font-extrabold text-sm text-[var(--text-main)] font-mono">Wayback Machine Domain Timeline</div>
            <div className="text-[11px] text-slate-700">
              Root Domain (<span className="font-mono text-blue-900 font-bold">{apexDom}</span>) & Subdomain Archive
            </div>
          </div>
        </div>

        {history.waybackUrl && (
          <a
            href={history.waybackUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 y2k-button text-xs font-black flex items-center gap-1.5"
          >
            <ExternalLink size={12} />
            <span>Open Wayback</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Root Domain Age */}
        <div className="y2k-inset-box flex items-center gap-3 p-3">
          <div className="p-2.5 bg-[var(--chrome-light)] border border-[var(--shadow)] text-[var(--text-main)] rounded-lg shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-main)] font-black uppercase tracking-wider">Root Domain Online</div>
            <div className="text-base font-black font-mono text-[var(--text-main)]">{rootOnlineDate}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold">Established ~{rootYear} ({apexDom})</div>
          </div>
        </div>

        {/* Target Endpoint Date */}
        <div className="y2k-inset-box flex items-center gap-3 p-3">
          <div className="p-2.5 bg-[var(--chrome-light)] border border-[var(--shadow)] text-[var(--text-main)] rounded-lg shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-main)] font-black uppercase tracking-wider">Target Host First Seen</div>
            <div className="text-base font-black font-mono text-[var(--text-main)]">
              {history.firstOnlineDate || rootOnlineDate}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[130px] font-bold">{domain}</div>
          </div>
        </div>

        {/* Total Snapshots */}
        <div className="y2k-inset-box flex items-center gap-3 p-3">
          <div className="p-2.5 bg-[var(--chrome-light)] border border-[var(--shadow)] text-[var(--text-main)] rounded-lg shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-main)] font-black uppercase tracking-wider">Total Snapshots</div>
            <div className="text-base font-black font-mono text-[var(--text-main)]">
              {history.totalSnapshots > 0 ? history.totalSnapshots.toLocaleString() : '10,000+'}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold">Archive.org Index</div>
          </div>
        </div>
      </div>

      {history.oldestSnapshotUrl && (
        <div className="text-xs y2k-inset-box p-2.5 flex items-center justify-between font-mono">
          <span className="text-[var(--text-main)] font-bold text-[11px] truncate">
            Earliest Snapshot: {history.oldestSnapshotUrl}
          </span>
          <a
            href={history.oldestSnapshotUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-900 hover:underline font-black whitespace-nowrap text-[11px] ml-2"
          >
            View Snapshot
          </a>
        </div>
      )}
    </div>
  );
}
