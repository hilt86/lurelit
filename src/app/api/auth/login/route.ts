import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, validateCredentials } from '@/lib/elastic';
import { createApiKeySession, createSession } from '@/lib/session';
import { loadGlobalConfig } from '@/lib/config';
import type { AuthMode } from '@/lib/kibana-auth';

export async function POST(request: NextRequest) {
  try {
    const { authMode = 'basic', username, password, apiKey } = await request.json() as {
      authMode?: AuthMode;
      username?: string;
      password?: string;
      apiKey?: string;
    };

    if (authMode === 'api_key' ? !apiKey : !username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const config = await loadGlobalConfig();
    if (!config?.kibanaUrl) {
      return NextResponse.json({ error: 'Kibana URL not configured. An admin must set up the connection first.' }, { status: 503 });
    }

    const result = authMode === 'api_key'
      ? await validateApiKey(config.kibanaUrl, apiKey!)
      : await validateCredentials(config.kibanaUrl, username!, password!);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    if (authMode === 'api_key') {
      await createApiKeySession(apiKey!, username || 'api-key-user');
    } else {
      await createSession(username!, password!);
    }

    return NextResponse.json({ ok: true, username: username || 'api-key-user' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 });
  }
}
