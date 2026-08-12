'use client';

import React from 'react';
import { DataSourceItem } from '@/lib/types';
import { Database, ExternalLink, ShieldAlert, Copy, Check, Link2 } from 'lucide-react';

interface DataSourceTableProps {
  dataSources: DataSourceItem[];
}

export function DataSourceTable({ dataSources }: DataSourceTableProps) {
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!dataSources || dataSources.length === 0) {
    return (
      <div className="y2k-inset-box p-6 text-center text-slate-700 font-mono text-xs bg-amber-50">
        No external database strings, SharePoint links, or API endpoints extracted from script bundles.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-900 font-mono font-bold">
        <span className="flex items-center gap-1.5">
          <Link2 size={14} className="text-black" />
          Extracted Endpoints & Links ({dataSources.length})
        </span>
        <span className="text-[11px] text-slate-600">DOM & JS Bundles Scanner</span>
      </div>

      <div className="overflow-x-auto y2k-inset-box">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="y2k-titlebar border-b border-[var(--shadow)] text-[var(--text-main)]">
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Method</th>
              <th className="p-2.5">Extracted Resource Link</th>
              <th className="p-2.5">Origin</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--shadow)] bg-[var(--chrome-light)]">
            {dataSources.map((ds, idx) => {
              const isSharePoint = ds.type === 'SharePoint';
              const isDbString = ds.type === 'Database String';
              const isS3 = ds.type === 'AWS S3 Bucket';

              return (
                <tr key={idx} className="hover:bg-[var(--panel-dark)] transition-colors">
                  <td className="p-3 border-r border-[var(--shadow)] font-bold">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black border border-[var(--shadow)] ${
                          isSharePoint
                            ? 'bg-[var(--chrome-dark)] text-black'
                            : isDbString
                            ? 'bg-[#ffaaaa] text-black animate-pulse'
                            : isS3
                            ? 'bg-[var(--silver-bg-2)] text-black'
                            : 'bg-[var(--silver-bg-1)] text-black'
                        }`}
                      >
                        {isDbString && <ShieldAlert size={11} />}
                        {isSharePoint && <Database size={11} />}
                        {ds.type}
                      </span>
                    </div>
                  </td>

                  <td className="p-2.5 font-mono text-[11px] text-black font-black">
                    {ds.method || 'GET'}
                  </td>

                  <td className="p-2.5 font-mono text-[11px] text-blue-900 break-all max-w-xs sm:max-w-md font-bold">
                    {ds.url}
                  </td>

                  <td className="p-2.5 text-[11px] text-slate-700 whitespace-nowrap font-mono">
                    {ds.source}
                  </td>

                  <td className="p-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(ds.url, idx)}
                        className="px-2.5 py-1 y2k-button text-[10px] font-black flex items-center gap-1"
                        title="Copy Link"
                      >
                        {copiedIdx === idx ? <Check size={11} className="text-emerald-700" /> : <Copy size={11} />}
                        <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                      </button>

                      {ds.url.startsWith('http') && (
                        <a
                          href={ds.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 y2k-button text-[10px] flex items-center gap-1"
                          title="Open Link"
                        >
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
