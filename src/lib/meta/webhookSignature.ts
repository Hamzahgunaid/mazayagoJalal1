import crypto from 'crypto';

type MetaSigAlgo = 'sha256' | 'sha1';

function timingSafeEqualStr(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function normalizeSignature(value: string | null | undefined, algo: MetaSigAlgo): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const prefix = `${algo}=`;
  if (!raw.toLowerCase().startsWith(prefix)) return null;
  const hex = raw.slice(prefix.length).trim().toLowerCase();
  return /^[a-f0-9]+$/.test(hex) ? `${prefix}${hex}` : null;
}

export function buildMetaSignature(rawBody: Buffer, algo: MetaSigAlgo = 'sha256') {
  const secret = process.env.META_APP_SECRET ?? '';
  if (!secret) return null;
  const digest = crypto.createHmac(algo, secret).update(rawBody).digest('hex');
  return `${algo}=${digest}`;
}

export function verifyMetaWebhookSignature(headers: Headers, rawBody: Buffer) {
  const sig256 = normalizeSignature(headers.get('x-hub-signature-256'), 'sha256');
  const sig1 = normalizeSignature(headers.get('x-hub-signature'), 'sha1');

  const hasSig256 = Boolean(sig256);
  const hasSig1 = Boolean(sig1);

  if (!hasSig256 && !hasSig1) {
    return {
      ok: false,
      hasSig256,
      hasSig1,
      usedAlgo: null as MetaSigAlgo | null,
      signaturePrefix: '',
      computedPrefix: '',
    };
  }

  if (sig256) {
    const expected256 = buildMetaSignature(rawBody, 'sha256') || '';
    const ok256 = expected256 ? timingSafeEqualStr(sig256, expected256) : false;
    if (ok256) {
      return {
        ok: true,
        hasSig256,
        hasSig1,
        usedAlgo: 'sha256' as const,
        signaturePrefix: sig256.slice(0, 12),
        computedPrefix: expected256.slice(0, 12),
      };
    }

    if (!sig1) {
      return {
        ok: false,
        hasSig256,
        hasSig1,
        usedAlgo: 'sha256' as const,
        signaturePrefix: sig256.slice(0, 12),
        computedPrefix: expected256.slice(0, 12),
      };
    }
  }

  const expected1 = buildMetaSignature(rawBody, 'sha1') || '';
  const ok1 = sig1 && expected1 ? timingSafeEqualStr(sig1, expected1) : false;
  return {
    ok: Boolean(ok1),
    hasSig256,
    hasSig1,
    usedAlgo: 'sha1' as const,
    signaturePrefix: (sig1 || '').slice(0, 12),
    computedPrefix: expected1.slice(0, 12),
  };
}


export function verifyMetaSignature(rawBody: Buffer, signature: string | null) {
  const normalized = String(signature || '').trim();
  if (!normalized) return false;

  if (normalized.toLowerCase().startsWith('sha1=')) {
    const expected = buildMetaSignature(rawBody, 'sha1');
    return Boolean(expected && timingSafeEqualStr(normalized.toLowerCase(), expected));
  }

  const expected = buildMetaSignature(rawBody, 'sha256');
  return Boolean(expected && timingSafeEqualStr(normalized.toLowerCase(), expected));
}
