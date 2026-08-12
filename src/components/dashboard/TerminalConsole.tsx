'use client';

import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

interface TerminalConsoleProps {
  logs: string[];
  analyzing: boolean;
}

export function TerminalConsole({ logs, analyzing }: TerminalConsoleProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="y2k-inset-box p-3 space-y-2 font-mono text-xs select-text">
      <div className="flex items-center justify-between border-b border-[#222] pb-2 text-[#aaa] select-none">
        <div className="flex items-center gap-2">
          <Terminal size={14} className={analyzing ? 'animate-spin text-white' : 'text-[#777]'} />
          <span className="font-black tracking-wider text-white">WEBALYZER KERNEL CONSOLE [LOGSTREAM]</span>
        </div>

        <button
          onClick={copyLogs}
          className="y2k-button text-[10px] px-2 py-0.5 flex items-center gap-1"
        >
          {copied ? <Check size={10} className="text-[#008822]" /> : <Copy size={10} />}
          <span>{copied ? 'COPIED' : 'COPY LOGS'}</span>
        </button>
      </div>

      <div className="h-44 overflow-y-auto space-y-1 text-[11px] leading-relaxed scrollbar-thin text-[#333d47]">
        {logs && logs.length > 0 ? (
          logs.map((log, idx) => {
            const isSystem = log.includes('[SYSTEM]');
            const isError = log.includes('[WARNING]') || log.includes('[ERROR]');
            const isSuccess = log.includes('[SUCCESS]');

            return (
              <div
                key={idx}
                className={
                  isSystem
                    ? 'text-[#005599] font-bold'
                    : isError
                    ? 'text-[#cc0000] font-bold'
                    : isSuccess
                    ? 'text-[#008822] font-bold'
                    : 'text-[#444]'
                }
              >
                {log}
              </div>
            );
          })
        ) : (
          <div className="text-gray-500 italic">
            [READY] Enter a target URL or domain above to launch OSINT inspection...
          </div>
        )}
        {analyzing && (
          <div className="text-[#005599] animate-pulse font-bold">
            &gt; Executing multi-threaded AST & network analysis...
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
