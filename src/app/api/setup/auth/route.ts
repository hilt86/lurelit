import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';

const KEY_FILE = join(process.cwd(), '.lurelit-admin-key');

export function getSetupSecret(): string {
  if (process.env.SETUP_SECRET) {
    return process.env.SETUP_SECRET;
  }

  if (existsSync(KEY_FILE)) {
    const existing = readFileSync(KEY_FILE, 'utf8').trim();
    if (existing) return existing;
  }

  const generated = randomBytes(16).toString('hex');
  writeFileSync(KEY_FILE, generated, 'utf8');
  console.log(`\n┌─────────────────────────────────────────────────────┐`);
  console.log(`│  Setup admin key: ${generated}  │`);
  console.log(`│  Use this to access /setup                          │`);
  console.log(`└─────────────────────────────────────────────────────┘\n`);
  return generated;
}

export async function POST(request: Request) {
  try {
    const { key } = await request.json() as { key: string };
    const secret = getSetupSecret();

    if (!key || key.trim() !== secret) {
      return NextResponse.json({ valid: false, error: 'Invalid admin key' }, { status: 401 });
    }

    const response = NextResponse.json({ valid: true });
    response.cookies.set('setup_auth', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
  const secret = getSetupSecret();

  if (cookieValue && cookieValue === secret) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false });
}
