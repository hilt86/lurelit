import { NextResponse } from 'next/server';

interface CheckRequest {
  kibanaUrl: string;
  username: string;
  password: string;
}

interface CheckResult {
  connected: boolean;
  version: string | null;
  workflows: boolean;
  agentBuilder: boolean;
  security: boolean;
  errors: string[];
}

function authHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function baseHeaders(username: string, password: string): Record<string, string> {
  return {
    'kbn-xsrf': 'true',
    'Authorization': authHeader(username, password),
    'Content-Type': 'application/json',
  };
}

export async function POST(request: Request) {
  try {
    const body: CheckRequest = await request.json();
    const { kibanaUrl, username, password } = body;

    if (!kibanaUrl || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedUrl = kibanaUrl.trim().replace(/\/+$/, '');
    const headers = baseHeaders(username, password);
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
