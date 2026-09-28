'use client';

import React, { useMemo, useState } from 'react';
import { SubdomainItem } from '@/lib/types';
import { ExternalLink, Crosshair } from 'lucide-react';

interface SubdomainTableProps {
  subdomains: SubdomainItem[];
  total: number;
  onScan: (target: string) => void;
  scanning: boolean;
}

export function SubdomainTable({ subdomains, total, onScan, scanning }: SubdomainTableProps) {
  const [query, setQuery] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);

  const filtered = useMemo(
    () => subdomains.filter((s) => (!liveOnly || s.resolves) && s.subdomain.includes(query.trim().toLowerCase())),
    [subdomains, query, liveOnly]
  );

  if (subdomains.length === 0) {
    return (
      <div className="y2k-inset-box p-6 text-center text-slate-700 font-mono text-xs">
        No subdomains found in Certificate Transparency logs (or the CT sources timed out).
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter subdomains..."
          className="flex-1 min-w-[160px] px-2 py-1.5 border border-[#a0a4a8] rounded-sm bg-[#f0f2f2] shadow-inner focus:outline-none"
        />
        <label className="flex items-center gap-1 font-bold cursor-pointer">
          <input type="checkbox" checked={liveOnly} onChange={(e) => setLiveOnly(e.target.checked)} /> Resolving only
        </label>
        <span className="text-[var(--text-muted)] font-bold">
          {filtered.length} shown / {total} total{total > subdomains.length ? ` (first ${subdomains.length} listed)` : ''}
        </span>
      </div>

      <div className="overflow-x-auto y2k-inset-box max-h-[520px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="y2k-titlebar text-[var(--text-main)]">
              <th className="p-2">Subdomain</th>
              <th className="p-2">DNS</th>
              <th className="p-2">IP</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--shadow)] bg-[var(--chrome-light)]">
            {filtered.map((s) => (
              <tr key={s.subdomain} className="hover:bg-[var(--panel-dark)]">
                <td className="p-2 font-bold text-blue-900 break-all">{s.subdomain}</td>
                <td className="p-2 whitespace-nowrap">
                  {s.resolves === undefined ? (
                    <span className="text-[var(--text-muted)]">not checked</span>
                  ) : s.resolves ? (
                    <span className="text-emerald-700 font-black">LIVE</span>
                  ) : (
                    <span className="text-red-600 font-black">NO DNS</span>
                  )}
                </td>
                <td className="p-2 text-[11px]">{s.ip || '-'}</td>
                <td className="p-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onScan(s.subdomain)}
                      disabled={scanning}
                      className="px-2 py-1 y2k-button text-[10px] font-black flex items-center gap-1 disabled:opacity-50"
                      title="Run a full Webalyzer scan on this subdomain"
                    >
                      <Crosshair size={11} /> Scan
                    </button>
                    <a href={`https://${s.subdomain}`} target="_blank" rel="noreferrer" className="px-2 py-1 y2k-button text-[10px]" title="Open">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
