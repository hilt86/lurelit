import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const AVATAR_DIR = join(process.cwd(), '.avatars');

function getAvatarPath(username: string): string {
  return join(AVATAR_DIR, `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { username } = await params;
  const path = getAvatarPath(username);
  if (!existsSync(path)) return NextResponse.json({ avatar: null });

  try {
    const raw = readFileSync(path, 'utf8');
    if (!raw) return NextResponse.json({ avatar: null });
    const data = JSON.parse(raw);
    return NextResponse.json({ avatar: data.dataUrl ?? null });
  } catch {
    return NextResponse.json({ avatar: null });
  }
}
