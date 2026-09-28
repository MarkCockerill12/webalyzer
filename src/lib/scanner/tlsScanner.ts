import tls from 'node:tls';
import net from 'node:net';
import { TlsInfo } from '../types';

function nameOf(entity: Record<string, any> | undefined): string | undefined {
  if (!entity) return undefined;
  const pick = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;
  return pick(entity.O) || pick(entity.CN) || undefined;
}

/** Real TLS handshake: certificate chain validity, hostname match, issuer, expiry and negotiated protocol. */
export function inspectTls(host: string, port = 443, timeoutMs = 7000): Promise<TlsInfo> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (info: TlsInfo) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(info);
    };

    const socket = tls.connect(
      {
        host,
        port,
        servername: net.isIP(host) ? undefined : host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || Object.keys(cert).length === 0) {
          return done({ checked: true, valid: false, error: 'No certificate presented' });
        }
        const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
        const daysRemaining = validTo ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000) : undefined;
        const altNames = (cert.subjectaltname || '')
          .split(',')
          .map((s) => s.trim().replace(/^DNS:/, ''))
          .filter(Boolean)
          .slice(0, 50);

        done({
          checked: true,
          valid: socket.authorized,
          error: socket.authorized ? undefined : String(socket.authorizationError || 'Certificate not trusted'),
          issuer: nameOf(cert.issuer as any),
          subject: (cert.subject as any)?.CN,
          validFrom: cert.valid_from ? new Date(cert.valid_from).toISOString().slice(0, 10) : undefined,
          validTo: validTo ? validTo.toISOString().slice(0, 10) : undefined,
          daysRemaining,
          protocol: socket.getProtocol() || undefined,
          altNames,
        });
      }
    );

    socket.on('error', (err) => done({ checked: true, valid: false, error: err.message }));
    socket.on('timeout', () => done({ checked: true, valid: false, error: 'TLS handshake timed out' }));
  });
}
