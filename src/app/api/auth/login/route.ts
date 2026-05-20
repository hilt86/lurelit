import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrentUser, validateApiKey, validateCredentials } from '@/lib/elastic';
import { createApiKeySession, createSession } from '@/lib/session';
import { loadGlobalConfig } from '@/lib/config';
import { buildApiKeyAuthHeader } from '@/lib/kibana-auth';
import { shouldUseSecureCookies } from '@/lib/cookies';
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
      // Clear the stale "configured" cookie so middleware will redirect back to /setup
      const response = NextResponse.json({
        error: 'No Kibana configuration found. Re-run the setup wizard at /setup to configure your connection.',
        needsSetup: true,
      }, { status: 503 });
      response.cookies.set('smish_configured', '', { maxAge: 0, path: '/' });
      return response;
    }

    // Guard: detect localhost Kibana URL when running on a serverless/cloud platform
    // where localhost can never reach the user's actual Kibana
    const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(:\d+)?(\/|$)/i.test(config.kibanaUrl);
    const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (isLocalhostUrl && isServerless) {
      const fromEnv = Boolean(process.env.KIBANA_URL);
      const detail = fromEnv
        ? `The KIBANA_URL environment variable in this deployment is set to "${config.kibanaUrl}". Remove or update it to your real Kibana endpoint and redeploy.`
        : `The saved Kibana URL is "${config.kibanaUrl}". Re-run the setup wizard with your real Kibana endpoint.`;
      return NextResponse.json({
        error: `Kibana URL points to localhost, which is unreachable from this serverless deployment. ${detail}`,
      }, { status: 502 });
    }

    const result = authMode === 'api_key'
      ? await validateApiKey(config.kibanaUrl, apiKey!)
      : await validateCredentials(config.kibanaUrl, username!, password!);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    const secureCookie = shouldUseSecureCookies(request);
    const cleanDisplayName = username?.trim();
    let displayUsername = cleanDisplayName;
    if (authMode === 'api_key') {
      const resolvedUser = await resolveCurrentUser(config.kibanaUrl, buildApiKeyAuthHeader(apiKey!));
      const meaningfulResolvedUser = resolvedUser && resolvedUser !== 'api-key-user' && !/^\d+$/.test(resolvedUser)
        ? resolvedUser
        : null;
      displayUsername = cleanDisplayName || meaningfulResolvedUser || 'api-key-user';
      await createApiKeySession(apiKey!, displayUsername, { secure: secureCookie });
    } else {
      await createSession(username!, password!, { secure: secureCookie });
    }

    return NextResponse.json({ ok: true, username: displayUsername });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 });
  }
}
