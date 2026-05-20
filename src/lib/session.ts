import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { cookies } from 'next/headers';
import type { AuthMode } from './kibana-auth';
import { shouldUseSecureCookies } from './cookies';

export type UserSession =
  | {
      authMode: 'basic';
      username: string;
      credentials: string; // base64-encoded "user:pass"
      authenticatedAt: string;
    }
  | {
      authMode: 'api_key';
      username: string;
      apiKey: string;
      authenticatedAt: string;
    };

const SESSION_COOKIE = 'smish_session';
const SALT = 'smish-session-v1';
const MAX_AGE = 60 * 60 * 24; // 24 hours

interface SessionCookieOptions {
  secure?: boolean;
}

function getKey(): Buffer {
  const secret = process.env.CONFIG_SECRET || 'smish-analyzer-default-key-change-me';
  return scryptSync(secret, SALT, 32);
}

function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

function decrypt(data: string): string {
  const key = getKey();
  const [ivHex, tagHex, encHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export async function createSession(username: string, password: string, options: SessionCookieOptions = {}): Promise<void> {
  const session: UserSession = {
    authMode: 'basic',
    username,
    credentials: Buffer.from(`${username}:${password}`).toString('base64'),
    authenticatedAt: new Date().toISOString(),
  };

  const encrypted = encrypt(JSON.stringify(session));
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encrypted, {
    httpOnly: true,
    secure: options.secure ?? shouldUseSecureCookies(),
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function createApiKeySession(apiKey: string, username = 'api-key-user', options: SessionCookieOptions = {}): Promise<void> {
  const session: UserSession = {
    authMode: 'api_key',
    username,
    apiKey: apiKey.trim(),
    authenticatedAt: new Date().toISOString(),
  };

  const encrypted = encrypt(JSON.stringify(session));
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encrypted, {
    httpOnly: true,
    secure: options.secure ?? shouldUseSecureCookies(),
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const json = decrypt(cookie.value);
    const parsed = JSON.parse(json) as UserSession & { authMode?: AuthMode };
    const authMode = parsed.authMode ?? 'basic';
    const session = {
      ...parsed,
      authMode,
    } as UserSession;

    const age = Date.now() - new Date(session.authenticatedAt).getTime();
    if (age > MAX_AGE * 1000) {
      await destroySession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function getAuthHeader(session: UserSession): string {
  if (session.authMode === 'api_key') return `ApiKey ${session.apiKey}`;
  return `Basic ${session.credentials}`;
}
