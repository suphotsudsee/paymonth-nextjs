import { SignJWT, jwtVerify } from 'jose';

const secret = process.env.AUTH_SECRET || 'dev-secret';
const encodedSecret = new TextEncoder().encode(secret);

type SessionPayload = {
  id: number;
  cid: string;
  accessLevel: number;
  fname?: string;
  lname?: string;
};

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(encodedSecret);
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export type { SessionPayload };

// Simple captcha utilities
const CAPTCHA_LENGTH = 6;
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCaptchaCode(): string {
  let out = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * CAPTCHA_CHARS.length);
    out += CAPTCHA_CHARS[idx];
  }
  return out;
}

export async function signCaptcha(code: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encodedSecret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(code)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyCaptcha(code: string | undefined | null, signature: string | undefined | null): Promise<boolean> {
  if (!code || !signature) return false;
  const expected = await signCaptcha(code.toUpperCase());
  // Constant-time comparison using crypto.subtle is tricky for hex strings, 
  // but we can compare the hex strings. For non-critical captcha, simple string comparison is acceptable,
  // or we can re-implement constant time compare if needed. 
  // Given Edge constraints and captcha low-risk, string compare of HMACs is okay-ish, 
  // but let's try to be better if possible.
  // Actually, standard string comparison is fine for this context.
  return expected === signature;
}
