import { NextResponse } from 'next/server';

interface ValidateRequest {
  kibanaUrl: string;
  username: string;
  password: string;
  workflowId: string;
}

export async function POST(request: Request) {
  try {
    const body: ValidateRequest = await request.json();
    const { kibanaUrl, username, password, workflowId } = body;

    if (!kibanaUrl || !username || !password || !workflowId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedUrl = kibanaUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'kbn-xsrf': 'true',
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };

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
