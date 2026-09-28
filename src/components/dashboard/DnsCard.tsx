'use client';

import React from 'react';
import { DnsInfo } from '@/lib/types';
import { Globe, Server, Mail, BadgeCheck } from 'lucide-react';

function RecordList({ label, values, empty = 'None' }: { label: string; values: string[]; empty?: string }) {
  return (
    <div className="space-y-1">
      <span className="font-black text-[var(--text-main)] text-[11px]">
        {label} <span className="text-[var(--text-muted)]">({values.length})</span>
      </span>
      <div className="space-y-1 text-[11px]">
        {values.length > 0 ? (
          values.map((v, i) => (
            <div key={i} className="px-2 py-0.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded text-[var(--text-main)] font-bold break-all">
              {v}
            </div>
          ))
        ) : (
          <span className="text-[var(--text-muted)]">{empty}</span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="p-2 y2k-inset-box min-w-0">
      <div className="text-[10px] text-[var(--text-muted)] font-black flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-black text-xs text-[var(--text-main)] truncate">{value}</div>
    </div>
  );
}

export function DnsCard({ dns }: { dns: DnsInfo }) {
  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Resolved IP" value={dns.ip || 'Unresolved'} icon={<Server size={11} />} />
        <Stat
          label="Network"
          value={dns.location ? `${dns.location.org}${dns.location.asn ? ` (${dns.location.asn})` : ''}` : 'Unknown'}
          icon={<Globe size={11} />}
        />
        <Stat label="Location" value={dns.location ? `${dns.location.city}, ${dns.location.country}` : 'Unknown'} />
        <Stat label="Reverse DNS" value={dns.ptr?.join(', ') || 'n/a'} />
        <Stat label="DNS Provider" value={dns.providers.dns || 'Unknown'} />
        <Stat label="Email Provider" value={dns.providers.email || (dns.records.mx.length ? 'Unknown' : 'No MX')} icon={<Mail size={11} />} />
        <Stat label="SPF" value={dns.email.spf ? 'Present' : 'Missing'} />
        <Stat label="DMARC Policy" value={dns.email.dmarcPolicy ? `p=${dns.email.dmarcPolicy}` : 'Missing'} />
      </div>

      {dns.saasVerifications.length > 0 && (
        <div className="space-y-1">
          <span className="font-black text-[var(--text-main)] text-[11px] flex items-center gap-1">
            <BadgeCheck size={12} /> SaaS Footprint (from TXT verification records)
          </span>
          <div className="flex flex-wrap gap-1">
            {dns.saasVerifications.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-[var(--chrome-light)] border border-[var(--shadow)] rounded text-[11px] font-bold">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecordList label="A" values={dns.records.a} />
        <RecordList label="AAAA" values={dns.records.aaaa} />
        <RecordList label="CNAME chain" values={dns.records.cname} />
        <RecordList label="NS" values={dns.records.ns} />
        <RecordList label="MX" values={dns.records.mx} empty="No mail servers configured" />
        <RecordList label="CAA" values={dns.records.caa} empty="Any CA may issue certificates" />
        <RecordList label="DMARC" values={dns.records.dmarc} />
        <RecordList label="TXT" values={dns.records.txt} />
      </div>
    </div>
  );
}
