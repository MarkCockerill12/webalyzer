'use client';

import React from 'react';
import { ExposedFile, RobotsInfo, SecretFinding, SecurityInfo, Severity } from '@/lib/types';
import { ShieldCheck, ShieldAlert, Lock, AlertTriangle, FileWarning, KeyRound, Info } from 'lucide-react';

interface SecurityCardProps {
  security: SecurityInfo;
  exposedFiles: ExposedFile[];
  secrets: SecretFinding[];
  robots?: RobotsInfo;
}

export const SEVERITY_STYLE: Record<Severity, string> = {
  critical: 'bg-[#ff8a8a] text-[#111] border-[#b00020]',
  high: 'bg-[#ffb3a0] text-[#111] border-[#c43d00]',
  medium: 'bg-[#ffe08a] text-[#111] border-[#a67c00]',
  low: 'bg-[#e8eef5] text-[#111] border-[var(--shadow)]',
  info: 'bg-[var(--chrome-light)] text-[var(--text-muted)] border-[var(--shadow)]',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black font-mono uppercase shrink-0 ${SEVERITY_STYLE[severity]}`}>{severity}</span>
  );
}

function HeaderRow({ name, value, good }: { name: string; value?: string; good: boolean }) {
  return (
    <div className="p-2 y2k-inset-box min-w-0">
      <div className="text-[var(--text-muted)] font-bold text-[10px]">{name}</div>
      <div className={`font-black mt-0.5 text-[11px] truncate ${good ? 'text-emerald-700' : 'text-red-600'}`} title={value}>
        {value || 'MISSING'}
      </div>
    </div>
  );
}

export function SecurityCard({ security, exposedFiles, secrets, robots }: SecurityCardProps) {
  const { tls, securityHeaders: h } = security;
  const isHighRisk = security.riskScore === 'D' || security.riskScore === 'F';
  const issues = security.findings.filter((f) => f.severity !== 'info');
  const notes = security.findings.filter((f) => f.severity === 'info');
  const infoFiles = exposedFiles.filter((f) => f.severity === 'info');

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Grade + TLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="y2k-inset-box p-3 flex items-center gap-3">
          {isHighRisk ? <ShieldAlert size={32} className="text-red-600 shrink-0" /> : <ShieldCheck size={32} className="text-emerald-700 shrink-0" />}
          <div>
            <div className="text-[10px] text-[var(--text-muted)] font-black uppercase">Security Grade</div>
            <div className="text-2xl font-black text-[var(--text-main)]">{security.riskScore}</div>
            <div className="text-[10px] font-bold text-[var(--text-muted)]">
              {security.score}/100 - {issues.length} issues
            </div>
          </div>
        </div>

        <div className="y2k-inset-box p-3 md:col-span-2 space-y-1">
          <div className="flex items-center gap-1.5 font-black text-[var(--text-main)]">
            <Lock size={13} className={tls.valid ? 'text-emerald-700' : 'text-red-600'} />
            TLS CERTIFICATE {tls.checked ? (tls.valid ? '- TRUSTED' : '- NOT TRUSTED') : '- NOT CHECKED (HTTP)'}
          </div>
          {tls.checked && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-[var(--text-main)]">
              <span>Issuer: <b>{tls.issuer || 'n/a'}</b></span>
              <span>Subject: <b>{tls.subject || 'n/a'}</b></span>
              <span>Expires: <b>{tls.validTo || 'n/a'}</b> ({tls.daysRemaining ?? '?'} days)</span>
              <span>Protocol: <b>{tls.protocol || 'n/a'}</b></span>
              <span className="col-span-2">
                HTTP -&gt; HTTPS redirect: <b>{security.httpsRedirect === null ? 'HTTP unreachable' : security.httpsRedirect ? 'Yes' : 'No'}</b>
              </span>
              {tls.error && <span className="col-span-2 text-red-600 font-bold">{tls.error}</span>}
              {tls.altNames && tls.altNames.length > 1 && (
                <span className="col-span-2 truncate" title={tls.altNames.join(', ')}>
                  SANs: {tls.altNames.slice(0, 6).join(', ')}
                  {tls.altNames.length > 6 ? ` +${tls.altNames.length - 6} more` : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Headers */}
      <div className="space-y-1.5">
        <div className="font-black text-[var(--text-main)] text-[11px]">Security Headers</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <HeaderRow name="Strict-Transport-Security" value={h.hsts} good={!!h.hsts} />
          <HeaderRow name="Content-Security-Policy" value={h.csp} good={!!h.csp} />
          <HeaderRow name="X-Frame-Options" value={h.xFrameOptions} good={!!h.xFrameOptions || /frame-ancestors/.test(h.csp || '')} />
          <HeaderRow name="X-Content-Type-Options" value={h.xContentTypeOptions} good={h.xContentTypeOptions === 'nosniff'} />
          <HeaderRow name="Referrer-Policy" value={h.referrerPolicy} good={!!h.referrerPolicy} />
          <HeaderRow name="Permissions-Policy" value={h.permissionsPolicy} good={!!h.permissionsPolicy} />
          <HeaderRow name="Access-Control-Allow-Origin" value={h.corsPolicy || 'not set'} good={h.corsPolicy !== '*'} />
          <HeaderRow name="Server / X-Powered-By" value={[h.server, h.poweredBy].filter(Boolean).join(' / ') || 'hidden'} good={!h.poweredBy && !/\d/.test(h.server || '')} />
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-1.5">
        <div className="font-black text-[var(--text-main)] text-[11px] flex items-center gap-1.5">
          <AlertTriangle size={13} /> Findings ({issues.length})
        </div>
        {issues.length === 0 && <div className="y2k-inset-box p-3 text-emerald-700 font-bold">No security issues detected by passive checks.</div>}
        {issues.map((f, i) => (
          <div key={i} className="y2k-inset-box p-2 flex items-start gap-2">
            <SeverityBadge severity={f.severity} />
            <div className="min-w-0">
              <div className="font-bold text-[var(--text-main)] font-sans">{f.title}</div>
              {f.detail && <div className="text-[10px] text-[var(--text-muted)] break-all">{f.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Secrets */}
      {secrets.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-black text-[var(--text-main)] text-[11px] flex items-center gap-1.5">
            <KeyRound size={13} /> Tokens & Keys in Client Code ({secrets.length})
          </div>
          {secrets.map((s, i) => (
            <div key={i} className="y2k-inset-box p-2 flex items-start gap-2">
              <SeverityBadge severity={s.severity} />
              <div className="min-w-0">
                <div className="font-bold text-[var(--text-main)]">
                  {s.kind}: <code className="text-blue-900">{s.masked}</code>
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  in {s.source}
                  {s.note ? ` - ${s.note}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Discovered paths */}
      <div className="space-y-1.5">
        <div className="font-black text-[var(--text-main)] text-[11px] flex items-center gap-1.5">
          <FileWarning size={13} /> Discovered Paths ({exposedFiles.length})
        </div>
        {exposedFiles.length === 0 && <div className="y2k-inset-box p-3 text-[var(--text-muted)]">None of the probed paths returned valid content.</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {[...exposedFiles.filter((f) => f.severity !== 'info'), ...infoFiles].map((f) => (
            <a key={f.path} href={f.url} target="_blank" rel="noreferrer" className="y2k-inset-box p-2 flex items-center gap-2 hover:bg-[var(--panel-dark)]">
              <SeverityBadge severity={f.severity} />
              <span className="font-bold text-blue-900 truncate">{f.path}</span>
              <span className="text-[10px] text-[var(--text-muted)] truncate">{f.label}</span>
            </a>
          ))}
        </div>
        {robots && robots.disallow.length > 0 && (
          <details className="y2k-inset-box p-2">
            <summary className="cursor-pointer font-bold text-[var(--text-main)]">robots.txt disallows {robots.disallow.length} paths (often reveals hidden areas)</summary>
            <div className="flex flex-wrap gap-1 mt-2">
              {robots.disallow.map((p) => (
                <span key={p} className="px-1.5 py-0.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded text-[10px]">
                  {p}
                </span>
              ))}
            </div>
          </details>
        )}
      </div>

      {notes.length > 0 && (
        <div className="space-y-1">
          <div className="font-black text-[var(--text-muted)] text-[11px] flex items-center gap-1.5">
            <Info size={13} /> Notes
          </div>
          {notes.map((f, i) => (
            <div key={i} className="text-[11px] text-[var(--text-muted)] pl-5">
              - {f.title}
              {f.detail ? `: ${f.detail}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
