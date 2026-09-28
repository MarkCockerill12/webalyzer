import { DnsInfo } from '../types';
import { getApexDomain, isIpAddress, safeFetchJson } from '../utils';

const RR = { A: 1, NS: 2, CNAME: 5, PTR: 12, MX: 15, TXT: 16, AAAA: 28, CAA: 257 } as const;
type RRType = keyof typeof RR;

async function queryDoh(name: string, type: RRType): Promise<{ type: number; data: string }[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const { ok, data } = await safeFetchJson<any>(url, {
    headers: { Accept: 'application/dns-json' },
    signal: AbortSignal.timeout(4000),
  });
  if (!ok || !data || !Array.isArray(data.Answer)) return [];
  return data.Answer.map((a: any) => ({ type: a.type, data: String(a.data) }));
}

async function records(name: string, type: RRType): Promise<string[]> {
  const answers = await queryDoh(name, type);
  return answers.filter((a) => a.type === RR[type]).map((a) => a.data.replace(/\.$/, ''));
}

/** DoH returns TXT values quoted and split into 255-byte chunks: "v=spf1 ..." "more" */
function unquoteTxt(txt: string): string {
  return txt.replace(/"\s+"/g, '').replace(/^"|"$/g, '');
}

export async function resolveA(host: string): Promise<string[]> {
  return records(host, 'A');
}

const DNS_PROVIDERS: [RegExp, string][] = [
  [/cloudflare\.com$/, 'Cloudflare DNS'],
  [/awsdns/, 'AWS Route 53'],
  [/azure-dns\./, 'Azure DNS'],
  [/googledomains\.com$|ns-cloud-[a-z]\d*\.googledomains|google\.com$/, 'Google Cloud DNS'],
  [/domaincontrol\.com$/, 'GoDaddy'],
  [/registrar-servers\.com$/, 'Namecheap'],
  [/nsone\.net$/, 'NS1'],
  [/dnsimple\.com$/, 'DNSimple'],
  [/digitalocean\.com$/, 'DigitalOcean'],
  [/vercel-dns\.com$/, 'Vercel DNS'],
  [/netlify/, 'Netlify DNS'],
  [/akam\.net$|akamai/, 'Akamai Edge DNS'],
  [/ultradns/, 'UltraDNS'],
  [/dynect\.net$/, 'Oracle Dyn'],
  [/hetzner/, 'Hetzner DNS'],
  [/ovh\.net$/, 'OVH'],
  [/wixdns\.net$/, 'Wix'],
  [/squarespacedns|squarespace/, 'Squarespace'],
  [/shopify/, 'Shopify'],
];

const EMAIL_PROVIDERS: [RegExp, string][] = [
  [/google\.com$|googlemail\.com$/, 'Google Workspace'],
  [/outlook\.com$|protection\.outlook\.com$/, 'Microsoft 365'],
  [/pphosted\.com$/, 'Proofpoint'],
  [/mimecast/, 'Mimecast'],
  [/zoho\./, 'Zoho Mail'],
  [/secureserver\.net$/, 'GoDaddy Email'],
  [/mailgun\.org$/, 'Mailgun'],
  [/sendgrid\.net$/, 'SendGrid'],
  [/amazonses\.com$|amazonaws\.com$/, 'Amazon SES / WorkMail'],
  [/protonmail\.ch$|proton\.me$/, 'Proton Mail'],
  [/messagingengine\.com$/, 'Fastmail'],
  [/icloud\.com$/, 'iCloud Mail'],
  [/barracudanetworks\.com$/, 'Barracuda'],
];

const SAAS_VERIFICATIONS: [RegExp, string][] = [
  [/^google-site-verification=/, 'Google Search Console / Workspace'],
  [/^MS=ms\d+/, 'Microsoft 365'],
  [/^facebook-domain-verification=/, 'Meta Business'],
  [/^atlassian-domain-verification=/, 'Atlassian'],
  [/^stripe-verification=/, 'Stripe'],
  [/^docusign=/, 'DocuSign'],
  [/^adobe-idp-site-verification=|^adobe-sign-verification=/, 'Adobe'],
  [/^apple-domain-verification=/, 'Apple'],
  [/^ZOOM_verify_/i, 'Zoom'],
  [/^slack-domain-verification=/, 'Slack'],
  [/^hubspot-developer-verification=|^hubspot-domain-verification=/, 'HubSpot'],
  [/^openai-domain-verification=/, 'OpenAI'],
  [/^anthropic-domain-verification/, 'Anthropic'],
  [/^cisco-ci-domain-verification=/, 'Cisco Webex'],
  [/^dropbox-domain-verification=/, 'Dropbox'],
  [/^onetrust-domain-verification=/, 'OneTrust'],
  [/^miro-verification=/, 'Miro'],
  [/^notion-domain-verification=/, 'Notion'],
  [/^canva-site-verification=/, 'Canva'],
  [/^github-verification|^_github-challenge/, 'GitHub'],
  [/^have-i-been-pwned-verification=/, 'Have I Been Pwned'],
  [/^globalsign-domain-verification=/, 'GlobalSign'],
  [/^teamviewer-sso-verification=/, 'TeamViewer'],
  [/^citrix-verification-code=/, 'Citrix'],
  [/^workplace-domain-verification=/, 'Workplace from Meta'],
  [/^yandex-verification:/, 'Yandex'],
  [/^pardot/i, 'Salesforce Pardot'],
  [/^mongodb-site-verification=/, 'MongoDB Atlas'],
  [/^postman-domain-verification=/, 'Postman'],
  [/^v=spf1.*include:_spf\.salesforce\.com/, 'Salesforce'],
  [/^v=spf1.*include:mail\.zendesk\.com/, 'Zendesk'],
  [/^v=spf1.*include:servers\.mcsv\.net/, 'Mailchimp'],
  [/^v=spf1.*include:sendgrid\.net/, 'SendGrid'],
];

function matchProvider(hosts: string[], table: [RegExp, string][]): string | undefined {
  for (const host of hosts) {
    const clean = host.toLowerCase().replace(/^\d+\s+/, '').replace(/\.$/, '');
    for (const [pattern, name] of table) if (pattern.test(clean)) return name;
  }
  return undefined;
}

async function lookupGeo(ip: string): Promise<DnsInfo['location'] | undefined> {
  const primary = await safeFetchJson<any>(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(4000) });
  if (primary.ok && primary.data?.success) {
    const g = primary.data;
    return {
      country: g.country || 'Unknown',
      city: g.city || 'Unknown',
      org: g.connection?.org || g.connection?.isp || 'Unknown network',
      asn: g.connection?.asn ? `AS${g.connection.asn}` : undefined,
    };
  }
  const fallback = await safeFetchJson<any>(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(4000) });
  if (fallback.ok && fallback.data && !fallback.data.error) {
    const g = fallback.data;
    return { country: g.country_name || 'Unknown', city: g.city || 'Unknown', org: g.org || 'Unknown network', asn: g.asn };
  }
  return undefined;
}

function reverseName(ip: string): string | null {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return null;
  return ip.split('.').reverse().join('.') + '.in-addr.arpa';
}

export async function fetchDnsAndGeo(hostname: string): Promise<DnsInfo> {
  const isIp = isIpAddress(hostname);
  const apex = getApexDomain(hostname);

  const dns: DnsInfo = {
    ip: isIp ? hostname : null,
    hostname,
    records: { a: [], aaaa: [], cname: [], mx: [], txt: [], ns: [], caa: [], dmarc: [] },
    providers: {},
    email: { spf: null, dmarcPolicy: null },
    saasVerifications: [],
  };

  if (!isIp) {
    const [aAnswers, aaaa, mx, txt, ns, caa, dmarcHost, dmarcApex] = await Promise.all([
      queryDoh(hostname, 'A'),
      records(hostname, 'AAAA'),
      records(apex, 'MX'),
      records(apex, 'TXT'),
      records(apex, 'NS'),
      records(apex, 'CAA'),
      records(`_dmarc.${hostname}`, 'TXT'),
      hostname !== apex ? records(`_dmarc.${apex}`, 'TXT') : Promise.resolve([] as string[]),
    ]);

    dns.records.a = aAnswers.filter((a) => a.type === RR.A).map((a) => a.data);
    dns.records.cname = aAnswers.filter((a) => a.type === RR.CNAME).map((a) => a.data.replace(/\.$/, ''));
    dns.records.aaaa = aaaa;
    dns.records.mx = mx;
    dns.records.txt = txt.map(unquoteTxt);
    dns.records.ns = ns;
    dns.records.caa = caa;
    dns.records.dmarc = (dmarcHost.length ? dmarcHost : dmarcApex).map(unquoteTxt).filter((t) => /^v=DMARC1/i.test(t));
    dns.ip = dns.records.a[0] || dns.records.aaaa[0] || null;

    dns.providers.dns = matchProvider(ns, DNS_PROVIDERS);
    dns.providers.email = matchProvider(mx, EMAIL_PROVIDERS);
    dns.email.spf = dns.records.txt.find((t) => /^v=spf1/i.test(t)) || null;
    dns.email.dmarcPolicy = dns.records.dmarc[0]?.match(/\bp=(\w+)/i)?.[1]?.toLowerCase() || null;

    const saas = new Set<string>();
    for (const t of dns.records.txt) {
      for (const [pattern, name] of SAAS_VERIFICATIONS) if (pattern.test(t)) saas.add(name);
    }
    dns.saasVerifications = Array.from(saas).sort();
  }

  if (dns.ip) {
    const reverse = reverseName(dns.ip);
    const [location, ptr] = await Promise.all([lookupGeo(dns.ip), reverse ? records(reverse, 'PTR') : Promise.resolve([])]);
    dns.location = location;
    if (ptr.length) dns.ptr = ptr;
  }

  return dns;
}
