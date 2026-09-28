'use client';

import React, { useMemo, useState } from 'react';
import { DataSourceItem } from '@/lib/types';
import { Database, ExternalLink, ShieldAlert, Copy, Check, Link2 } from 'lucide-react';

interface DataSourceTableProps {
  dataSources: DataSourceItem[];
}

export function DataSourceTable({ dataSources }: DataSourceTableProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [hideTelemetry, setHideTelemetry] = useState(true);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    dataSources.forEach((d) => counts.set(d.type, (counts.get(d.type) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [dataSources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dataSources.filter(
      (d) =>
        (typeFilter === 'all' || d.type === typeFilter) &&
        (!hideTelemetry || typeFilter === 'Telemetry / Tracking' || d.type !== 'Telemetry / Tracking') &&
        (!q || d.url.toLowerCase().includes(q) || d.source.toLowerCase().includes(q))
    );
  }, [dataSources, typeFilter, query, hideTelemetry]);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!dataSources || dataSources.length === 0) {
    return (
      <div className="y2k-inset-box p-6 text-center text-slate-700 font-mono text-xs bg-amber-50">
        No API endpoints, cloud storage, SharePoint links or database strings were found in the page, its scripts or its network traffic.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
        <span className="flex items-center gap-1.5 text-slate-900">
          <Link2 size={14} />
          {filtered.length} / {dataSources.length}
        </span>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-2 py-1 border border-[#a0a4a8] rounded-sm bg-[#f0f2f2]">
          <option value="all">All types</option>
          {typeCounts.map(([type, count]) => (
            <option key={type} value={type}>
              {type} ({count})
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search URL or source..."
          className="flex-1 min-w-[160px] px-2 py-1 border border-[#a0a4a8] rounded-sm bg-[#f0f2f2] shadow-inner focus:outline-none"
        />
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={hideTelemetry} onChange={(e) => setHideTelemetry(e.target.checked)} /> Hide telemetry
        </label>
      </div>

      <div className="overflow-x-auto y2k-inset-box max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="y2k-titlebar border-b border-[var(--shadow)] text-[var(--text-main)]">
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Method</th>
              <th className="p-2.5">Resource</th>
              <th className="p-2.5">Found In</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--shadow)] bg-[var(--chrome-light)]">
            {filtered.map((ds, idx) => {
              const isSharePoint = ds.type === 'SharePoint';
              const isDbString = ds.type === 'Database String';
              const link = ds.resolvedUrl || ds.url;

              return (
                <tr key={`${ds.type}-${ds.url}-${idx}`} className="hover:bg-[var(--panel-dark)] transition-colors">
                  <td className="p-3 border-r border-[var(--shadow)] font-bold">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-black border border-[var(--shadow)] whitespace-nowrap text-black ${
                        isDbString ? 'bg-[#ffaaaa]' : isSharePoint ? 'bg-[var(--chrome-dark)]' : ds.type === 'Telemetry / Tracking' ? 'bg-[var(--panel-dark)]' : 'bg-[var(--silver-bg-1)]'
                      }`}
                    >
                      {isDbString && <ShieldAlert size={11} />}
                      {isSharePoint && <Database size={11} />}
                      {ds.type}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-black font-black">{ds.method || 'GET'}</td>
                  <td className="p-2.5 font-mono text-[11px] text-blue-900 break-all max-w-xs sm:max-w-md font-bold">{ds.url}</td>
                  <td className="p-2.5 text-[11px] text-slate-700 font-mono max-w-[180px] truncate" title={ds.source}>
                    {ds.source}
                  </td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(link, idx)}
                        className="px-2.5 py-1 y2k-button text-[10px] font-black flex items-center gap-1"
                        title="Copy absolute URL"
                      >
                        {copiedIdx === idx ? <Check size={11} className="text-emerald-700" /> : <Copy size={11} />}
                        <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                      {/^https?:\/\//.test(link) && (
                        <a href={link} target="_blank" rel="noreferrer" className="px-2 py-1 y2k-button text-[10px] flex items-center gap-1" title="Open Link">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
