import { safeFetchJson } from '../utils';

export async function fetchSubdomainsFromCrtsh(domain: string): Promise<string[]> {
  try {
    // Some domains might be too big for crt.sh and time out, so we wrap it
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    // Using crt.sh JSON output format
    const url = `https://crt.sh/?q=%.${domain}&output=json`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    
    const subdomains = new Set<string>();
    
    data.forEach((entry: any) => {
      if (entry.name_value) {
        // name_value can contain multiple domains separated by newlines
        const names = entry.name_value.split('\n');
        names.forEach((name: string) => {
          name = name.trim().toLowerCase();
          if (name && !name.includes('*') && name !== domain && name.endsWith(domain)) {
            subdomains.add(name);
          }
        });
      }
    });
    
    return Array.from(subdomains);
  } catch (e) {
    return [];
  }
}
