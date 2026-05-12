import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalConfig } from '@/lib/config';
import { getSession, getAuthHeader } from '@/lib/session';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  const config = await loadGlobalConfig();
  const session = await getSession();

  if (!config?.kibanaUrl) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${config.kibanaUrl}/api/workflows/executions/${executionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'kbn-xsrf': 'true',
          'Authorization': getAuthHeader(session),
        },
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
      { error: err instanceof Error ? err.message : 'Cancel failed' },
      { status: 500 }
    );
  }
}
