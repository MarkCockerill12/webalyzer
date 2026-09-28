import { SecretFinding, Severity } from '../types';
import { ContentSource } from './endpointExtractor';

interface SecretRule {
  kind: string;
  regex: RegExp;
  severity: Severity;
  note?: string;
}

const RULES: SecretRule[] = [
  { kind: 'AWS Access Key ID', regex: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/g, severity: 'high', note: 'Check whether a matching secret key is also exposed.' },
  { kind: 'Private Key', regex: /(-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----)/g, severity: 'critical' },
  { kind: 'Stripe Secret Key', regex: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,})\b/g, severity: 'critical' },
  { kind: 'GitHub Token', regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g, severity: 'critical' },
  { kind: 'Slack Token', regex: /\b(xox[baprs]-[0-9A-Za-z-]{10,})\b/g, severity: 'critical' },
  { kind: 'Slack Webhook', regex: /(https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+)/g, severity: 'high' },
  { kind: 'Discord Webhook', regex: /(https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+)/g, severity: 'high' },
  { kind: 'SendGrid API Key', regex: /\b(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})\b/g, severity: 'critical' },
  { kind: 'OpenAI API Key', regex: /\b(sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,}|sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20})\b/g, severity: 'critical' },
  { kind: 'Anthropic API Key', regex: /\b(sk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{80,})\b/g, severity: 'critical' },
  { kind: 'Google API Key', regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g, severity: 'low', note: 'Often public by design (Maps / Firebase) - verify the key has HTTP referrer and API restrictions.' },
  { kind: 'Mailgun API Key', regex: /\b(key-[0-9a-f]{32})\b/g, severity: 'high' },
  { kind: 'Twilio Account SID', regex: /\b(AC[0-9a-f]{32})\b/g, severity: 'low' },
];

function mask(value: string): string {
  if (value.length <= 12) return value.slice(0, 4) + '****';
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function scanForSecrets(sources: ContentSource[]): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const seen = new Set<string>();

  const push = (finding: SecretFinding, raw: string) => {
    if (seen.has(raw)) return;
    seen.add(raw);
    findings.push(finding);
  };

  for (const { label, content } of sources) {
    if (!content) continue;

    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.regex.exec(content)) !== null) {
        push({ kind: rule.kind, masked: mask(m[1]), severity: rule.severity, source: label, note: rule.note }, m[1]);
      }
    }

    // JWTs: Supabase / Firebase anon keys are public by design, but a service_role key bypasses all row-level security.
    const jwtRegex = /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g;
    let m: RegExpExecArray | null;
    while ((m = jwtRegex.exec(content)) !== null) {
      const payload = decodeJwtPayload(m[1]);
      if (!payload) continue;
      const role = typeof payload.role === 'string' ? payload.role : undefined;
      if (role === 'service_role') {
        push({ kind: 'Supabase service_role key', masked: mask(m[1]), severity: 'critical', source: label, note: 'Grants full database access, bypassing row-level security.' }, m[1]);
      } else {
        push({
          kind: role ? `JWT (role: ${role})` : 'Hardcoded JWT',
          masked: mask(m[1]),
          severity: role === 'anon' ? 'info' : 'low',
          source: label,
          note: role === 'anon' ? 'Public anon key - safe only if row-level security is enforced.' : 'Hardcoded token in client code.',
        }, m[1]);
      }
    }

    if (findings.length >= 100) break;
  }

  return findings;
}
