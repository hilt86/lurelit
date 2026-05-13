import { NextResponse } from 'next/server';
import { kibanaHeadersFromPayload, type AuthMode } from '@/lib/kibana-auth';

interface ValidateRequest {
  kibanaUrl: string;
  authMode?: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
  workflowId: string;
}

export async function POST(request: Request) {
  try {
    const body: ValidateRequest = await request.json();
    const { kibanaUrl, authMode = 'basic', username, password, apiKey, workflowId } = body;

    if (!kibanaUrl || !workflowId || (authMode === 'api_key' ? !apiKey : !username || !password)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedUrl = kibanaUrl.trim().replace(/\/+$/, '');
    const headers = kibanaHeadersFromPayload({ authMode, username, password, apiKey });

    const res = await fetch(`${normalizedUrl}/api/workflows/workflow/${workflowId}`, { headers });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        valid: true,
        name: data.name || workflowId,
        description: data.description || null,
      });
    }

    if (res.status === 404) {
      return NextResponse.json({ valid: false, error: 'Workflow not found' });
    }

    return NextResponse.json({ valid: false, error: `Kibana returned ${res.status}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
