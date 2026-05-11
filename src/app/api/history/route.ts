import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalConfig } from '@/lib/config';
import { getSession, getAuthHeader } from '@/lib/session';

export async function GET(request: NextRequest) {
  const config = loadGlobalConfig();
  const session = await getSession();

  if (!config?.kibanaUrl || !config?.workflowId) {
    return NextResponse.json({ results: [], total: 0, page: 1, size: 20 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = url.searchParams.get('page') ?? '1';
  const size = url.searchParams.get('size') ?? '20';

  const headers: Record<string, string> = {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json',
    'Authorization': getAuthHeader(session),
  };

  try {
    const res = await fetch(`${config.kibanaUrl}/api/workflows/workflow/${config.workflowId}/executions?page=${page}&size=${size}`, { headers });
    if (!res.ok) throw new Error(`Kibana returned ${res.status}`);
    const data = await res.json();

    const results = (data.results ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      status: (e.status as string)?.toLowerCase() ?? 'unknown',
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
      duration: e.duration,
      executedBy: e.executedBy,
      triggeredBy: e.triggeredBy,
      error: e.error,
      isTestRun: e.isTestRun,
    }));

    return NextResponse.json({ results, total: data.total ?? 0, page: data.page ?? 1, size: data.size ?? 20 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
