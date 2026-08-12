'use client';

import React from 'react';
import { TechItem } from '@/lib/types';
import { Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

interface TechStackGridProps {
  techStack: TechItem[];
}

export function TechStackGrid({ techStack }: TechStackGridProps) {
  if (!techStack || techStack.length === 0) {
    return (
      <div className="y2k-inset-box p-6 text-center text-slate-700 font-mono text-xs bg-amber-50">
        <AlertCircle className="mx-auto mb-2 text-pink-600" size={24} />
        No technology signatures matched on target response.
      </div>
    );
  }

  const categories = Array.from(new Set(techStack.map((t) => t.category)));

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const items = techStack.filter((t) => t.category === cat);
        return (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[var(--text-main)] border-b-2 border-[var(--shadow)] pb-1 font-mono">
              <span className="p-1 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded text-[var(--text-main)]">
                <Cpu size={14} />
              </span>
              <span>{cat}</span>
              <span className="px-2 py-0.5 bg-[var(--chrome-light)] text-[var(--text-main)] border border-[var(--shadow)] rounded-full text-[10px]">
                {items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {items.map((tech, idx) => (
                <div
                  key={idx}
                  className="y2k-inset-box p-3 flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-extrabold text-sm text-[var(--text-main)] flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[var(--chrome-light)] border border-[var(--shadow)]" />
                      {tech.name}
                    </div>
                    {tech.description && (
                      <p className="text-[11px] text-slate-700 leading-tight font-sans">{tech.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2 py-0.5 bg-[var(--chrome-light)] text-[var(--text-main)] border border-[var(--shadow)] rounded-full text-[10px] font-mono font-black flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      {tech.confidence}%
                    </span>
                    {tech.version && (
                      <span className="text-[10px] text-slate-600 font-mono">v{tech.version}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
