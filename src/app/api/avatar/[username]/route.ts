import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getStorage } from '@/lib/storage';

function avatarKey(username: string): string {
  return `avatar:${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { username } = await params;
  const storage = getStorage();
  const data = await storage.get(avatarKey(username));
  if (!data) return NextResponse.json({ avatar: null });

  try {
    const parsed = JSON.parse(data);
    return NextResponse.json({ avatar: parsed.dataUrl ?? null });
  } catch {
    return NextResponse.json({ avatar: null });
  }
}
