import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalConfig } from '@/lib/config';
import { getSession, getAuthHeader } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  const config = loadGlobalConfig();
  const session = await getSession();

  if (!config?.kibanaUrl) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { proceed_with_hunt: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.proceed_with_hunt !== 'boolean') {
    return NextResponse.json({ error: 'proceed_with_hunt must be a boolean' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${config.kibanaUrl}/api/workflows/executions/${executionId}/resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'true',
          'Authorization': getAuthHeader(session),
        },
        body: JSON.stringify({
          input: {
            proceed_with_hunt: body.proceed_with_hunt,
            ...(body.reason ? { reason: body.reason } : {}),
          },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Kibana returned ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Resume failed' },
      { status: 500 }
    );
  }
}
