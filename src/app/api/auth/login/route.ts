import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials } from '@/lib/elastic';
import { createSession } from '@/lib/session';
import { loadGlobalConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json() as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const config = loadGlobalConfig();
    if (!config?.kibanaUrl) {
      return NextResponse.json({ error: 'Kibana URL not configured. An admin must set up the connection first.' }, { status: 503 });
    }

    const result = await validateCredentials(config.kibanaUrl, username, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    await createSession(username, password);

    return NextResponse.json({ ok: true, username });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 });
  }
}
