'use client';

import React from 'react';
import { SecurityInfo, DnsInfo } from '@/lib/types';
import { ShieldCheck, ShieldAlert, Globe, Server, Lock, AlertTriangle } from 'lucide-react';

interface SecurityDnsCardProps {
  security: SecurityInfo;
  dns: DnsInfo;
}

export function SecurityDnsCard({ security, dns }: SecurityDnsCardProps) {
  const isHighRisk = security.riskScore === 'D' || security.riskScore === 'F';

  return (
    <div className="y2k-window p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security & SSL Health */}
        <div className="space-y-3 pr-0 md:pr-2 border-b-2 md:border-b-0 md:border-r-2 border-[var(--shadow)] pb-4 md:pb-0">
          <div className="flex items-center justify-between border-b-2 border-[var(--shadow)] pb-2 font-mono">
            <div className="flex items-center gap-2">
              {isHighRisk ? (
                <ShieldAlert size={18} className="text-red-600 animate-pulse" />
              ) : (
                <ShieldCheck size={18} className="text-emerald-700" />
              )}
              <span className="font-extrabold text-sm text-[var(--text-main)]">Security & SSL Audit</span>
            </div>

            <div
              className={`px-2.5 py-0.5 rounded font-mono font-black text-xs border border-[var(--shadow)] ${
                security.riskScore.startsWith('A')
                  ? 'bg-[var(--chrome-light)] text-[var(--text-main)]'
                  : security.riskScore === 'B'
                  ? 'bg-[var(--silver-bg-2)] text-[var(--text-main)]'
                  : security.riskScore === 'C'
                  ? 'bg-[var(--panel-dark)] text-[var(--text-main)]'
                  : 'bg-[#ffaaaa] text-[#111] animate-pulse'
              }`}
            >
              GRADE {security.riskScore}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 y2k-inset-box font-mono">
              <span className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                <Lock size={13} className={security.sslValid ? 'text-emerald-700' : 'text-red-600'} />
                SSL Certificate
              </span>
              <span className="font-black text-[var(--text-main)]">
                {security.sslValid ? 'VALID (HTTPS)' : 'INSECURE (HTTP)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 y2k-inset-box">
                <div className="text-[var(--text-muted)] font-bold">HSTS Security</div>
                <div className={`font-black mt-0.5 ${security.securityHeaders.hsts ? 'text-emerald-700' : 'text-red-600'}`}>
                  {security.securityHeaders.hsts ? 'ENABLED' : 'MISSING'}
                </div>
              </div>

              <div className="p-2 y2k-inset-box">
                <div className="text-[var(--text-muted)] font-bold">CSP Policy</div>
                <div className={`font-black mt-0.5 ${security.securityHeaders.csp ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {security.securityHeaders.csp ? 'ENABLED' : 'MISSING'}
                </div>
              </div>
            </div>

            {security.vulnerabilitiesFound.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="font-black text-[var(--text-main)] text-[11px] font-mono">Identified Security Risks:</span>
                <div className="space-y-1">
                  {security.vulnerabilitiesFound.map((v, i) => (
                    <div key={i} className="text-[11px] text-[#111] bg-[#ffaaaa] p-2 rounded border border-[var(--shadow)] flex items-start gap-1.5 font-sans font-bold">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5 text-[#111]" />
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DNS Infrastructure */}
        <div className="space-y-3 pl-0 md:pl-2">
          <div className="flex items-center gap-2 border-b-2 border-[var(--shadow)] pb-2 font-mono">
            <Server size={18} className="text-[var(--text-main)]" />
            <span className="font-extrabold text-sm text-[var(--text-main)]">DNS & Infrastructure</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2 y2k-inset-box">
                <div className="text-[10px] text-[var(--text-muted)] font-black">Resolved IP</div>
                <div className="font-black text-sm text-[var(--text-main)]">{dns.ip}</div>
              </div>

              <div className="p-2 y2k-inset-box">
                <div className="text-[10px] text-[var(--text-muted)] font-black flex items-center gap-1">
                  <Globe size={11} /> Location
                </div>
                <div className="font-bold text-xs text-[var(--text-main)] truncate">
                  {dns.location?.country || 'Global Host'} ({dns.location?.org || 'CDN'})
                </div>
              </div>
            </div>

            <div className="space-y-1 font-mono">
              <span className="font-black text-[var(--text-main)] text-[11px]">A Records:</span>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {dns.records.a.length > 0 ? (
                  dns.records.a.map((ip, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded text-[var(--text-main)] font-bold">
                      {ip}
                    </span>
                  ))
                ) : (
                  <span className="text-[var(--text-muted)]">None detected</span>
                )}
              </div>
            </div>

            <div className="space-y-1 font-mono">
              <span className="font-black text-[var(--text-main)] text-[11px]">MX Records (Mail Servers):</span>
              <div className="space-y-1 text-[11px]">
                {dns.records.mx.length > 0 ? (
                  dns.records.mx.slice(0, 3).map((mx, i) => (
                    <div key={i} className="px-2 py-0.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded text-[var(--text-main)] truncate font-bold">
                      {mx}
                    </div>
                  ))
                ) : (
                  <span className="text-[var(--text-muted)]">No MX mail servers configured</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
