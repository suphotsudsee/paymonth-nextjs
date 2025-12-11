import { SignJWT, jwtVerify } from 'jose';
import { auth as nextAuth } from '@/auth';

const secret = process.env.AUTH_SECRET || '8f3a1e9c4b7d20568f3a1e9c4b7d20568f3a1e9c4b7d20568f3a1e9c4b7d2056';
const encodedSecret = new TextEncoder().encode(secret);

type SessionPayload = {
  id: number;
  cid: string;
  accessLevel: number;
  fname?: string;
  lname?: string;
  status?: string;
};

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(encodedSecret);
}

export async function verifySession(
  token?: string,
  options?: { skipNextAuth?: boolean },
): Promise<SessionPayload | null> {
  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      return payload as unknown as SessionPayload;
    } catch {
      // fall through to NextAuth verification
    }
  }

  if (options?.skipNextAuth) {
    return null;
  }

  try {
    const nextSession = await nextAuth();
    if (nextSession?.user) {
      const user = nextSession.user as Record<string, unknown>;
      const name = typeof user.name === 'string' ? user.name.trim() : '';
      const [fname, ...rest] = name.split(/\s+/);
      const cid =
        typeof user.citizenId === 'string'
          ? user.citizenId
          : typeof user.cid === 'string'
            ? user.cid
            : typeof user.email === 'string'
              ? user.email
              : 'thaiid-user';
      const accessLevelRaw = user.accessLevel;
      const accessLevel =
        typeof accessLevelRaw === 'number' && Number.isFinite(accessLevelRaw)
          ? accessLevelRaw
          : Number(accessLevelRaw);
      const status =
        typeof user.status === 'string'
          ? user.status
          : typeof user.role === 'string'
            ? user.role
            : undefined;

      return {
        id: Number(user.id ?? 0),
        cid: String(cid),
        accessLevel: Number.isFinite(accessLevel) ? accessLevel : 0,
        fname: fname || undefined,
        lname: rest.join(' ').trim() || undefined,
        status,
      };
    }
  } catch {
    // ignore NextAuth errors and return null
  }

  return null;
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
