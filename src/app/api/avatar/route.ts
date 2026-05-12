import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getStorage } from '@/lib/storage';

function avatarKey(username: string): string {
  return `avatar:${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const storage = getStorage();
  const data = await storage.get(avatarKey(session.username));
  if (!data) return NextResponse.json({ avatar: null });

  try {
    const parsed = JSON.parse(data);
    return NextResponse.json({ avatar: parsed.dataUrl });
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

    const storage = getStorage();
    await storage.set(avatarKey(session.username), JSON.stringify({ dataUrl, updatedAt: new Date().toISOString() }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const storage = getStorage();
  await storage.del(avatarKey(session.username));
  return NextResponse.json({ ok: true });
}
