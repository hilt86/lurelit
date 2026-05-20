import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { getStorage } from '@/lib/storage';
import { shouldUseSecureCookies } from '@/lib/cookies';

const KEY_FILE = join(process.cwd(), '.lurelit-admin-key');
const FALLBACK_KEY_FILE = join('/tmp', '.lurelit-admin-key');

export async function getSetupSecret(): Promise<string> {
  if (process.env.SETUP_SECRET) {
    return process.env.SETUP_SECRET;
  }

  if (process.env.UPSTASH_REDIS_REST_URL) {
    const storage = getStorage();
    const stored = await storage.get('admin-key');
    if (stored) return stored;
    const generated = randomBytes(16).toString('hex');
    await storage.set('admin-key', generated);
    return generated;
  }

  for (const keyFile of [KEY_FILE, FALLBACK_KEY_FILE]) {
    try {
      if (existsSync(keyFile)) {
        const existing = readFileSync(keyFile, 'utf8').trim();
        if (existing) return existing;
      }
    } catch {
      continue;
    }
  }

  const generated = randomBytes(16).toString('hex');
  try {
    const fs = require('fs');
    fs.writeFileSync(KEY_FILE, generated, 'utf8');
  } catch {
    try {
      const fs = require('fs');
      fs.writeFileSync(FALLBACK_KEY_FILE, generated, 'utf8');
    } catch {
      // Cannot persist — will be regenerated on restart
    }
  }
  return generated;
}

export async function POST(request: Request) {
  try {
    const { key } = await request.json() as { key: string };
    const secret = await getSetupSecret();

    if (!key || key.trim() !== secret) {
      return NextResponse.json({ valid: false, error: 'Invalid admin key' }, { status: 401 });
    }

    const response = NextResponse.json({ valid: true });
    response.cookies.set('setup_auth', secret, {
      httpOnly: true,
      secure: shouldUseSecureCookies(request),
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/setup_auth=([^;]+)/);
  const cookieValue = match?.[1];
  const secret = await getSetupSecret();

  if (cookieValue && cookieValue === secret) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false });
}
