// src/lib/auth.ts
// Cookie-based admin session using Node.js HMAC (no external JWT library)
import crypto from 'crypto';

const SECRET = () =>
  process.env.ADMIN_SECRET || 'globex-fallback-secret-please-set-env';

/**
 * Creates a signed session token.
 * Format: base64( timestamp:globex-admin:HMAC_hex )
 */
export function createToken(): string {
  const payload = `${Date.now()}:globex-admin`;
  const sig = crypto
    .createHmac('sha256', SECRET())
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

/**
 * Verifies a session token.
 * Returns true if signature matches and token is < 24 hours old.
 */
export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastColon = decoded.lastIndexOf(':');
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    const expectedSig = crypto
      .createHmac('sha256', SECRET())
      .update(payload)
      .digest('hex');

    if (sig !== expectedSig) return false;

    const [timestamp] = payload.split(':');
    const age = Date.now() - parseInt(timestamp, 10);
    return age < 24 * 60 * 60 * 1000; // 24 hours
  } catch {
    return false;
  }
}

/**
 * Verifies admin password from environment variable.
 * timingSafeEqual requires equal-length buffers — pad to same length first.
 */
export function verifyPassword(password: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) return false;
  try {
    // Pad/trim to same byte length to avoid timingSafeEqual throwing
    const a = Buffer.from(password.padEnd(128).slice(0, 128));
    const b = Buffer.from(adminPass.padEnd(128).slice(0, 128));
    const match = crypto.timingSafeEqual(a, b);
    // Also check real lengths match (prevents padded false-positives)
    return match && password.length === adminPass.length;
  } catch {
    return false;
  }
}

export const COOKIE_NAME = 'globex-admin-token';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 24 hours in seconds
  path: '/',
};
