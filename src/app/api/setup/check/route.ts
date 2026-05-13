import { NextResponse } from 'next/server';
import { kibanaHeadersFromPayload, type AuthMode } from '@/lib/kibana-auth';

interface CheckRequest {
  kibanaUrl: string;
  authMode?: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
}

interface CheckResult {
  connected: boolean;
  version: string | null;
  workflows: boolean;
  agentBuilder: boolean;
  security: boolean;
  errors: string[];
}

export async function POST(request: Request) {
  try {
    const body: CheckRequest = await request.json();
    const { kibanaUrl, authMode = 'basic', username, password, apiKey } = body;

    if (!kibanaUrl || (authMode === 'api_key' ? !apiKey : !username || !password)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedUrl = kibanaUrl.trim().replace(/\/+$/, '');
    const headers = kibanaHeadersFromPayload({ authMode, username, password, apiKey });
    const result: CheckResult = {
      connected: false,
      version: null,
      workflows: false,
      agentBuilder: false,
      security: false,
      errors: [],
    };

    // Check connection and version
    try {
      const statusRes = await fetch(`${normalizedUrl}/api/status`, { headers });
      if (statusRes.ok) {
        result.connected = true;
        const statusData = await statusRes.json();
        result.version = statusData?.version?.number || null;
      } else if (statusRes.status === 401) {
        result.errors.push('Authentication failed - check username and password');
        return NextResponse.json(result);
      } else {
        result.errors.push(`Kibana returned status ${statusRes.status}`);
        return NextResponse.json(result);
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'Connection failed');
      return NextResponse.json(result);
    }

    // Check workflows
    try {
      const wfRes = await fetch(`${normalizedUrl}/api/workflows`, { headers });
      result.workflows = wfRes.ok;
      if (!result.workflows) {
        result.errors.push('Workflows API not available');
      }
    } catch {
      result.errors.push('Could not reach Workflows API');
    }

    // Check Agent Builder
    try {
      const abRes = await fetch(`${normalizedUrl}/api/agent_builder/agents`, { headers });
      result.agentBuilder = abRes.ok || abRes.status === 404;
      if (!result.agentBuilder) {
        result.errors.push('Agent Builder not available');
      }
    } catch {
      result.errors.push('Could not reach Agent Builder API');
    }

    // Check Security solution
    try {
      const secRes = await fetch(`${normalizedUrl}/api/detection_engine/rules/_find?per_page=1`, { headers });
      result.security = secRes.ok || secRes.status === 404;
      if (!result.security) {
        result.errors.push('Security solution not enabled');
      }
    } catch {
      result.errors.push('Could not reach Security API');
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
