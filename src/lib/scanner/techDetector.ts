import { TechItem } from '../types';
import { TECH_SIGNATURES, TechSignature } from './techSignatures';

export interface TechDetectionInput {
  html: string;
  scriptUrls: string[];
  scriptContents: string[];
  headers: Record<string, string>;
  cookieNames: string[];
  url: string;
  jsGlobals?: Record<string, string | true>;
}

// Signal strength -> confidence
const CONFIDENCE = { js: 100, headers: 100, cookies: 95, meta: 100, url: 95, html: 90, scripts: 90, code: 75, implied: 70 } as const;
type Signal = keyof typeof CONFIDENCE;

function extractMeta(html: string): Record<string, string[]> {
  const meta: Record<string, string[]> = {};
  const tagRegex = /<meta\s[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(html)) !== null) {
    const tag = m[0];
    const name = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (name && content !== undefined) (meta[name] ||= []).push(content);
  }
  return meta;
}

export function detectTechStack(input: TechDetectionInput): TechItem[] {
  const found = new Map<string, TechItem>();
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.headers)) headers[k.toLowerCase()] = String(v);
  const meta = extractMeta(input.html);
  const code = input.scriptContents.join('\n');

  const record = (sig: TechSignature, signal: Signal, version?: string) => {
    const existing = found.get(sig.name);
    const confidence = CONFIDENCE[signal];
    const cleanVersion = version && /\d/.test(version) ? version.trim().slice(0, 24) : undefined;
    if (existing) {
      existing.confidence = Math.max(existing.confidence, confidence);
      if (!existing.version && cleanVersion) existing.version = cleanVersion;
      if (!existing.evidence!.includes(signal)) existing.evidence!.push(signal);
      return;
    }
    found.set(sig.name, {
      name: sig.name,
      category: sig.category,
      description: sig.description,
      confidence,
      version: cleanVersion,
      evidence: [signal],
    });
  };

  const testAll = (sig: TechSignature, signal: Signal, patterns: RegExp[] | undefined, haystacks: string[]) => {
    if (!patterns) return;
    for (const pattern of patterns) {
      for (const hay of haystacks) {
        const match = hay.match(pattern);
        if (match) {
          record(sig, signal, match[1]);
          return;
        }
      }
    }
  };

  for (const sig of TECH_SIGNATURES) {
    testAll(sig, 'html', sig.html, [input.html]);
    testAll(sig, 'scripts', sig.scripts, input.scriptUrls);
    if (code) testAll(sig, 'code', sig.code, [code]);
    testAll(sig, 'cookies', sig.cookies, input.cookieNames);
    if (sig.url?.test(input.url)) record(sig, 'url');

    if (sig.headers) {
      for (const [name, pattern] of Object.entries(sig.headers)) {
        const value = headers[name];
        if (value === undefined) continue;
        const match = value.match(pattern);
        if (match) record(sig, 'headers', match[1]);
      }
    }

    if (sig.meta) {
      for (const [name, pattern] of Object.entries(sig.meta)) {
        for (const content of meta[name] || []) {
          const match = content.match(pattern);
          if (match) record(sig, 'meta', match[1]);
        }
      }
    }

    const global = input.jsGlobals?.[sig.name];
    if (global) record(sig, 'js', typeof global === 'string' ? global : undefined);
  }

  // Resolve implications transitively (WooCommerce -> WordPress -> PHP, Next.js -> React, ...)
  const queue = Array.from(found.keys());
  while (queue.length > 0) {
    const sig = TECH_SIGNATURES.find((s) => s.name === queue.shift());
    for (const impliedName of sig?.implies || []) {
      const implied = TECH_SIGNATURES.find((s) => s.name === impliedName);
      if (implied && !found.has(impliedName)) {
        record(implied, 'implied');
        queue.push(impliedName);
      }
    }
  }

  return Array.from(found.values()).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}
