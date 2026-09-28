'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnalysisResult, ScanStreamMessage } from '@/lib/types';
import { buildMarkdownReport } from '@/lib/report';
import { TechStackGrid } from '@/components/dashboard/TechStackGrid';
import { DataSourceTable } from '@/components/dashboard/DataSourceTable';
import { WaybackTimeline } from '@/components/dashboard/WaybackTimeline';
import { SecurityCard } from '@/components/dashboard/SecurityCard';
import { DnsCard } from '@/components/dashboard/DnsCard';
import { SubdomainTable } from '@/components/dashboard/SubdomainTable';
import { VisualNetworkGraph } from '@/components/dashboard/VisualNetworkGraph';
import { TerminalConsole } from '@/components/dashboard/TerminalConsole';
import { Search, ArrowRight, Download, FileText, RefreshCw, Cpu, Database, History, Sparkles, Globe, Terminal, Shield, Server, Network, Square } from 'lucide-react';
import confetti from 'canvas-confetti';

type TabId = 'stack' | 'datasources' | 'security' | 'dns' | 'subdomains' | 'graph' | 'history' | 'terminal';
const RECENT_KEY = 'webalyzer.recent';

export default function HomePage() {
  const [targetInput, setTargetInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('stack');
  const [recent, setRecent] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));
    } catch {}
  }, []);

  const rememberTarget = (domain: string) => {
    setRecent((prev) => {
      const next = [domain, ...prev.filter((d) => d !== domain)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAnalyze = async (overrideUrl?: string) => {
    const urlToScan = (overrideUrl ?? targetInput).trim();
    if (!urlToScan || analyzing) return;
    if (overrideUrl) setTargetInput(overrideUrl);

    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    setErrorMsg(null);
    setLiveLogs([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToScan }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scan failed (HTTP ${res.status}).`);
      }

      // NDJSON stream: log lines while scanning, then the final result
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let final: AnalysisResult | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const msg = JSON.parse(line) as ScanStreamMessage;
          if (msg.type === 'log') setLiveLogs((prev) => [...prev, msg.line]);
          else if (msg.type === 'result') final = msg.data;
          else throw new Error(msg.error);
        }
      }
      if (!final) throw new Error('Scan ended without a result.');

      setResult(final);
      setTargetInput(final.targetUrl);
      rememberTarget(final.domain);
      if (activeTab === 'terminal') setActiveTab('stack');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    } catch (err: any) {
      if (err?.name !== 'AbortError') setErrorMsg(err?.message || 'Error occurred while inspecting target.');
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
    }
  };

  const downloadReport = (format: 'json' | 'md') => {
    if (!result) return;
    const content = format === 'json' ? JSON.stringify(result, null, 2) : buildMarkdownReport(result);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webalyzer-${result.domain}-${result.analyzedAt.slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const issueCount = result?.security.findings.filter((f) => f.severity !== 'info').length ?? 0;
  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: string | number }[] = result
    ? [
        { id: 'stack', label: 'TECH STACK', icon: <Cpu size={16} />, badge: result.techStack.length },
        { id: 'datasources', label: 'ENDPOINTS', icon: <Database size={16} />, badge: result.dataSources.length },
        { id: 'security', label: 'SECURITY AUDIT', icon: <Shield size={16} />, badge: issueCount },
        { id: 'dns', label: 'DNS & INFRA', icon: <Server size={16} /> },
        { id: 'subdomains', label: 'SUBDOMAINS', icon: <Network size={16} />, badge: result.subdomainTotal },
        { id: 'graph', label: 'NETWORK GRAPH', icon: <Sparkles size={16} /> },
        { id: 'history', label: 'WAYBACK TIMELINE', icon: <History size={16} /> },
        { id: 'terminal', label: 'LOG STREAM', icon: <Terminal size={16} /> },
      ]
    : [];

  const firstSeen = result?.history.apexDomainFirstOnlineDate || result?.history.firstOnlineDate;
  const summary = result
    ? [
        { label: 'Target Domain', value: result.domain, sub: `HTTP ${result.httpStatus ?? 'n/a'}` },
        { label: 'First Archived', value: firstSeen || 'Never', sub: firstSeen ? `${result.history.apexDomain} (Wayback)` : 'No Wayback captures' },
        { label: 'Tech Stack', value: `${result.techStack.length} Technologies`, sub: 'Fingerprinted' },
        { label: 'Endpoints', value: `${result.dataSources.length} Extracted`, sub: `${result.secrets.length} secret(s) flagged` },
        { label: 'Security Grade', value: `GRADE ${result.security.riskScore}`, sub: `${result.security.score}/100, ${issueCount} issues` },
        { label: 'Scan Duration', value: `${(result.executionTimeMs / 1000).toFixed(1)} s`, sub: new Date(result.analyzedAt).toLocaleTimeString() },
      ]
    : [];

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
              <span>Target URL / Domain / IP:</span>
            </div>

            <div className="relative flex-1">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Enter domain, URL or IP (e.g. example.com)"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono border border-[#a0a4a8] rounded-sm bg-[#f0f2f2] text-[#2b2d31] shadow-inner focus:outline-none focus:border-[#666]"
              />
              <Search size={16} className="absolute left-3.5 top-3 text-slate-700" />
            </div>

            {analyzing ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="y2k-button-pink px-6 py-2.5 text-xs font-black flex items-center justify-center gap-2 shrink-0 cursor-pointer font-mono"
              >
                <RefreshCw size={14} className="animate-spin" />
                <span>ANALYZING...</span>
                <Square size={12} />
              </button>
            ) : (
              <button type="submit" className="y2k-button-green px-6 py-2.5 text-xs font-black flex items-center justify-center gap-2 shrink-0 cursor-pointer font-mono">
                <span>INSPECT</span>
                <ArrowRight size={14} />
              </button>
            )}
          </form>

          {(recent.length > 0 || result) && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-300 font-mono text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {recent.length > 0 && <span className="text-[10px] font-black text-[#666]">RECENT:</span>}
                {recent.map((d) => (
                  <button key={d} onClick={() => handleAnalyze(d)} disabled={analyzing} className="px-2 py-0.5 y2k-button text-[10px] font-bold disabled:opacity-50">
                    {d}
                  </button>
                ))}
              </div>
              {result && (
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadReport('json')} className="px-3 py-1 y2k-button text-[11px] font-black flex items-center gap-1">
                    <Download size={12} />
                    <span>Export JSON</span>
                  </button>
                  <button onClick={() => downloadReport('md')} className="px-3 py-1 y2k-button-pink text-[11px] font-black flex items-center gap-1">
                    <FileText size={12} />
                    <span>Download Report.md</span>
                  </button>
                </div>
              )}
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

        {/* Live scan console - visible while a scan is running */}
        {analyzing && (
          <div className="y2k-window p-4">
            <div className="y2k-titlebar mb-4 text-[#006622]">
              <span>LIVE SCAN</span>
              <span className="ml-3 text-[10px] text-[#006622] font-mono">{liveLogs.length} events</span>
            </div>
            <TerminalConsole logs={liveLogs} analyzing />
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Top Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono">
              {summary.map((card) => (
                <div key={card.label} className="y2k-window p-3 min-w-0">
                  <div className="text-[10px] text-[#666] font-black uppercase tracking-wider">{card.label}</div>
                  <div className="font-black text-[#111] truncate text-sm" title={card.value}>
                    {card.value}
                  </div>
                  <div className="text-[10px] text-[#555] truncate font-bold">{card.sub}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Sidebar Tabs */}
              <div className="w-full md:w-64 flex flex-col gap-2 shrink-0 relative">
                <div className="y2k-titlebar mb-2 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] flex justify-between">
                  <span>MODULES</span>
                  <span className="text-[9px] opacity-50 tracking-tighter">V.3.0</span>
                </div>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 font-black rounded-sm border border-[var(--silver-shadow)] transition-all ${
                      activeTab === tab.id ? 'y2k-button-active translate-x-2' : 'y2k-button'
                    } flex items-center justify-between`}
                  >
                    <span className="flex items-center gap-2">
                      {tab.icon} {tab.label}
                    </span>
                    {tab.badge !== undefined && <span className="text-[10px] opacity-70">[{tab.badge}]</span>}
                  </button>
                ))}
              </div>

              {/* Active Tab Content */}
              <div className="flex-1 w-full min-w-0 space-y-6">
                {activeTab === 'stack' && (
                  <div className="y2k-window p-6 space-y-4">
                    <div className="y2k-titlebar mb-4">Tech Stack Analysis</div>
                    <TechStackGrid techStack={result.techStack} />
                  </div>
                )}

                {activeTab === 'datasources' && (
                  <div className="y2k-window p-6 space-y-4">
                    <div className="y2k-titlebar mb-4">Discovered Endpoints</div>
                    <DataSourceTable dataSources={result.dataSources} />
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="y2k-window p-6">
                    <div className="y2k-titlebar mb-4">Security Audit</div>
                    <SecurityCard security={result.security} exposedFiles={result.exposedFiles} secrets={result.secrets} robots={result.robots} />
                  </div>
                )}

                {activeTab === 'dns' && (
                  <div className="y2k-window p-6">
                    <div className="y2k-titlebar mb-4">DNS & Infrastructure</div>
                    <DnsCard dns={result.dns} />
                  </div>
                )}

                {activeTab === 'subdomains' && (
                  <div className="y2k-window p-6">
                    <div className="y2k-titlebar mb-4">Subdomains (Certificate Transparency)</div>
                    <SubdomainTable subdomains={result.subdomains} total={result.subdomainTotal} onScan={handleAnalyze} scanning={analyzing} />
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

                {activeTab === 'terminal' && (
                  <div className="y2k-window p-4">
                    <div className="y2k-titlebar mb-4 text-[#006622]">
                      <span>KERNEL ACCESS</span>
                      <span className="text-[10px] text-[#006622] font-mono">SYS_ROOT</span>
                    </div>
                    <TerminalConsole logs={result.terminalLogs} analyzing={false} />
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
