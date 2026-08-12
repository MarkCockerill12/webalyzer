export async function safeFetchJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data: T | null; status: number; text: string }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    const cleanText = text.trim();

    if (cleanText.startsWith('<') || cleanText.startsWith('<!DOCTYPE')) {
      return { ok: false, data: null, status: res.status, text: cleanText };
    }

    try {
      const data = JSON.parse(cleanText);
      return { ok: res.ok, data, status: res.status, text: cleanText };
    } catch (parseErr) {
      return { ok: false, data: null, status: res.status, text: cleanText };
    }
  } catch (err: any) {
    return { ok: false, data: null, status: 0, text: err?.message || 'Network error' };
  }
}
