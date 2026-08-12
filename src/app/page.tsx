'use client';

import React, { useState } from 'react';
import { AnalysisResult } from '@/lib/types';
import { TechStackGrid } from '@/components/dashboard/TechStackGrid';
import { DataSourceTable } from '@/components/dashboard/DataSourceTable';
import { WaybackTimeline } from '@/components/dashboard/WaybackTimeline';
import { SecurityDnsCard } from '@/components/dashboard/SecurityDnsCard';
import { VisualNetworkGraph } from '@/components/dashboard/VisualNetworkGraph';
import { TerminalConsole } from '@/components/dashboard/TerminalConsole';
import { Search, ArrowRight, Download, FileText, RefreshCw, Cpu, Database, History, Sparkles, Server, Globe, Terminal, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const [targetInput, setTargetInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stack' | 'datasources' | 'graph' | 'history' | 'security' | 'terminal'>('stack');

  const handleAnalyze = async (overrideUrl?: string) => {
    const urlToScan = overrideUrl || targetInput;
    if (!urlToScan.trim()) return;

    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToScan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze target site.');
      }

      setResult(data);
      setTargetInput(data.targetUrl || urlToScan);

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while inspecting target.');
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadReport = (format: 'json' | 'md') => {
    if (!result) return;
    let content = '';
    let filename = `webalyzer-${result.domain}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(result, null, 2);
    } else {
      content = `# WEBALYZER RECONNAISSANCE REPORT
Target URL: ${result.targetUrl}
Domain: ${result.domain}
Root Apex Domain: ${result.history.apexDomain || result.domain}
Analyzed At: ${result.analyzedAt}

## Tech Stack (${result.techStack.length})
${result.techStack.map(t => `- **${t.name}** (${t.category})`).join('\n')}

## Data Sources & SharePoint Links (${result.dataSources.length})
${result.dataSources.map(d => `- [${d.type}] ${d.url} (${d.source})`).join('\n')}

## Historical Timeline
- Root Domain First Online Date: ${result.history.apexDomainFirstOnlineDate || result.history.firstOnlineDate}
- Specific Target First Seen: ${result.history.firstOnlineDate}
- Total Archive Snapshots: ${result.history.totalSnapshots}

## Security Audit: GRADE ${result.security.riskScore}
- SSL Valid: ${result.security.sslValid}
- Identified Risks: ${result.security.vulnerabilitiesFound.join('; ')}
`;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-transparent text-[#2b2d31] font-sans flex flex-col p-4 md:p-8">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Top Input Bar */}
        <div className="y2k-window p-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="flex items-center gap-2 font-mono font-black text-xs text-[#2b2d31] shrink-0">
              <Globe size={18} />
              <span>Target URL / Domain:</span>
            </div>

            <div className="relative flex-1">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Enter domain or public URL (e.g. https://example.com)"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono border border-[#a0a4a8] rounded-sm bg-[#f0f2f2] text-[#2b2d31] shadow-inner focus:outline-none focus:border-[#666]"
              />
              <Search size={16} className="absolute left-3.5 top-3 text-slate-700" />
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="y2k-button-green px-6 py-2.5 text-xs font-black flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 font-mono"
            >
              {analyzing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>ANALYZING...</span>
                </>
              ) : (
                <>
                  <span>INSPECT</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {result && (
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-300 font-mono text-xs">
              <button
                onClick={() => downloadReport('json')}
                className="px-3 py-1 y2k-button text-[11px] font-black flex items-center gap-1"
              >
                <Download size={12} />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => downloadReport('md')}
                className="px-3 py-1 y2k-button-pink text-[11px] font-black flex items-center gap-1"
              >
                <FileText size={12} />
                <span>Download Report.md</span>
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 bg-[#4a0000] border border-[#ff0000] rounded-sm text-[#ff6666] text-xs flex items-center justify-between font-mono font-bold shadow-[0px_0px_10px_rgba(255,0,0,0.3)]">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-black underline hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Top Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono">
              <div className="y2k-window p-3">
                <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">Target Domain</div>
                <div className="font-black text-[#111] truncate text-sm" title={result.domain}>{result.domain}</div>
                <div className="text-[10px] text-[#555] truncate font-bold">{result.history.apexDomain}</div>
              </div>

              <div className="y2k-window p-3">
                <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">First Online Date</div>
                <div className="font-black text-[#111] text-sm">{result.history.apexDomainFirstOnlineDate || result.history.firstOnlineDate}</div>
                <div className="text-[10px] text-[#555] font-bold">Root Domain Age</div>
              </div>

              <div className="y2k-window p-3">
                <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">Tech Stack</div>
                <div className="font-black text-[#111] text-sm">{result.techStack.length} Technologies</div>
                <div className="text-[10px] text-[#555] font-bold">Detected Signatures</div>
              </div>

              <div className="y2k-window p-3">
                <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">Endpoints & DBs</div>
                <div className="font-black text-[#111] text-sm">{result.dataSources.length} Extracted</div>
                <div className="text-[10px] text-[#555] font-bold">APIs & Links</div>
              </div>

              <div className="y2k-window p-3">
                <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">Security Grade</div>
                <div className="font-black text-[#111] text-sm">GRADE {result.security.riskScore}</div>
                <div className="text-[10px] text-[#555] font-bold">{result.security.sslValid ? 'HTTPS Verified' : 'HTTP Unsecured'}</div>
              </div>

              <div className="y2k-window p-3">
                <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">Scan Duration</div>
                <div className="font-black text-[#111] text-sm">{result.executionTimeMs} ms</div>
                <div className="text-[10px] text-[#555] font-bold">Kernel Time</div>
              </div>
            </div>

            {/* Xbox-style Layout: Sidebar + Main Content */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              
              {/* Sidebar Tabs (Original Xbox dashboard style) */}
              <div className="w-full md:w-64 flex flex-col gap-2 shrink-0 relative">
                <div className="absolute -left-6 top-10 bottom-10 w-[2px] bg-[var(--silver-shadow)]"></div>
                <div className="y2k-titlebar mb-2 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] flex justify-between">
                  <span>MODULES</span>
                  <span className="text-[9px] opacity-50 tracking-tighter">V.1.0.4</span>
                </div>
                <button
                  onClick={() => setActiveTab('stack')}
                  className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                    activeTab === 'stack'
                      ? 'y2k-button-active translate-x-2'
                      : 'y2k-button'
                  } flex items-center justify-between`}
                >
                  <span className="flex items-center gap-2"><Cpu size={16} /> TECH STACK</span>
                  <span className="text-[10px] opacity-70">[{result.techStack.length}]</span>
                </button>

                <button
                  onClick={() => setActiveTab('datasources')}
                  className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                    activeTab === 'datasources'
                      ? 'y2k-button-active translate-x-2'
                      : 'y2k-button'
                  } flex items-center justify-between`}
                >
                  <span className="flex items-center gap-2"><Database size={16} /> ENDPOINTS</span>
                  <span className="text-[10px] opacity-70">[{result.dataSources.length}]</span>
                </button>

                <button
                  onClick={() => setActiveTab('graph')}
                  className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                    activeTab === 'graph'
                      ? 'y2k-button-active translate-x-2'
                      : 'y2k-button'
                  } flex items-center gap-2`}
                >
                  <Sparkles size={16} /> NETWORK GRAPH
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                    activeTab === 'history'
                      ? 'y2k-button-active translate-x-2'
                      : 'y2k-button'
                  } flex items-center gap-2`}
                >
                  <History size={16} /> WAYBACK TIMELINE
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                    activeTab === 'security'
                      ? 'y2k-button-active translate-x-2'
                      : 'y2k-button'
                  } flex items-center gap-2`}
                >
                  <Shield size={16} /> SECURITY AUDIT
                </button>

                <button
                  onClick={() => setActiveTab('terminal')}
                  className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                    activeTab === 'terminal'
                      ? 'y2k-button-active translate-x-2'
                      : 'y2k-button'
                  } flex items-center justify-between`}
                >
                  <span className="flex items-center gap-2"><Terminal size={16} /> LOG STREAM</span>
                  <span className="text-[10px] text-green-700 animate-pulse">●</span>
                </button>
              </div>

              {/* Active Tab Content Display (Main Area) */}
              <div className="flex-1 w-full min-w-0 space-y-6">
                {activeTab === 'stack' && (
                  <div className="y2k-window p-6 space-y-4">
                    <div className="y2k-titlebar mb-4">
                      <span>Tech Stack Analysis</span>
                      <span className="text-[10px] text-gray-500 font-mono tracking-widest">[ // SCAN_COM // ]</span>
                    </div>
                    <TechStackGrid techStack={result.techStack} />
                  </div>
                )}

                {activeTab === 'datasources' && (
                  <div className="y2k-window p-6 space-y-4">
                    <div className="y2k-titlebar mb-4">Discovered Endpoints</div>
                    <DataSourceTable dataSources={result.dataSources} />
                  </div>
                )}

                {activeTab === 'graph' && (
                  <div className="y2k-window p-2">
                    <div className="y2k-titlebar mb-2">Dependency Map</div>
                    <VisualNetworkGraph data={result.graphData} />
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="y2k-window p-6">
                    <div className="y2k-titlebar mb-4">Historical Archive</div>
                    <WaybackTimeline history={result.history} domain={result.domain} />
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="y2k-window p-6">
                    <div className="y2k-titlebar mb-4">Security Overview</div>
                    <SecurityDnsCard security={result.security} dns={result.dns} />
                  </div>
                )}

                {activeTab === 'terminal' && (
                  <div className="y2k-window p-4">
                     <div className="y2k-titlebar mb-4 text-[#006622]">
                       <span>KERNEL ACCESS</span>
                       <span className="text-[10px] text-[#006622] font-mono">SYS_ROOT</span>
                     </div>
                    <TerminalConsole logs={result.terminalLogs} analyzing={analyzing} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
