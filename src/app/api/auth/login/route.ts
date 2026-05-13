import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrentUser, validateApiKey, validateCredentials } from '@/lib/elastic';
import { createApiKeySession, createSession } from '@/lib/session';
import { loadGlobalConfig } from '@/lib/config';
import { buildApiKeyAuthHeader } from '@/lib/kibana-auth';
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

    const cleanDisplayName = username?.trim();
    let displayUsername = cleanDisplayName;
    if (authMode === 'api_key') {
      const resolvedUser = await resolveCurrentUser(config.kibanaUrl, buildApiKeyAuthHeader(apiKey!));
      const meaningfulResolvedUser = resolvedUser && resolvedUser !== 'api-key-user' && !/^\d+$/.test(resolvedUser)
        ? resolvedUser
        : null;
      displayUsername = cleanDisplayName || meaningfulResolvedUser || 'api-key-user';
      await createApiKeySession(apiKey!, displayUsername);
    } else {
      await createSession(username!, password!);
    }

    return NextResponse.json({ ok: true, username: displayUsername });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 });
  }
}
