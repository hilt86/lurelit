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

async function responseSummary(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  if (!body) return `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    return parsed.message || parsed.error || `HTTP ${res.status}`;
  } catch {
    return body.slice(0, 180);
  }
}

function permissionHint(feature: string, status: number): string {
  if (status === 401) return `${feature}: authentication failed`;
  if (status === 403) return `${feature}: API key is valid but lacks required Kibana privileges`;
  if (status === 404) return `${feature}: endpoint not found in this project/space`;
  return `${feature}: Kibana returned ${status}`;
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

    // Check workflows. Serverless supports /api/workflows, but privilege errors should be
    // surfaced as auth/permission problems rather than "feature missing".
    try {
      const wfRes = await fetch(`${normalizedUrl}/api/workflows?size=1`, { headers });
      result.workflows = wfRes.ok;
      if (!result.workflows) {
        const detail = await responseSummary(wfRes);
        result.errors.push(`${permissionHint('Workflows API', wfRes.status)} (${detail})`);
      }
    } catch {
      result.errors.push('Could not reach Workflows API');
    }

    // Check Agent Builder. This is required by the bundled workflow's ai.agent steps, but
    // return statuses can differ by license/project type, so keep the message diagnostic.
    try {
      const abRes = await fetch(`${normalizedUrl}/api/agent_builder/agents`, { headers });
      result.agentBuilder = abRes.ok || abRes.status === 404;
      if (!result.agentBuilder) {
        const detail = await responseSummary(abRes);
        result.errors.push(`${permissionHint('Agent Builder', abRes.status)} (${detail})`);
      }
    } catch {
      result.errors.push('Could not reach Agent Builder API');
    }

    // Check Security solution. This is a capability probe only; the workflow can still be
    // imported if the API key has index read privileges for the hunt step.
    try {
      const secRes = await fetch(`${normalizedUrl}/api/detection_engine/rules/_find?per_page=1`, { headers });
      result.security = secRes.ok || secRes.status === 404;
      if (!result.security) {
        const detail = await responseSummary(secRes);
        result.errors.push(`${permissionHint('Security solution probe', secRes.status)} (${detail})`);
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
