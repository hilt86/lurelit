import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const AVATAR_DIR = join(process.cwd(), '.avatars');

function getAvatarPath(username: string): string {
  return join(AVATAR_DIR, `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const path = getAvatarPath(session.username);
  if (!existsSync(path)) return NextResponse.json({ avatar: null });

  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return NextResponse.json({ avatar: data.dataUrl });
  } catch {
    return NextResponse.json({ avatar: null });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { dataUrl } = await request.json() as { dataUrl: string };
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    if (!existsSync(AVATAR_DIR)) mkdirSync(AVATAR_DIR, { recursive: true });
    writeFileSync(getAvatarPath(session.username), JSON.stringify({ dataUrl, updatedAt: new Date().toISOString() }), 'utf8');

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const path = getAvatarPath(session.username);
  if (existsSync(path)) writeFileSync(path, '', 'utf8');
  return NextResponse.json({ ok: true });
}
