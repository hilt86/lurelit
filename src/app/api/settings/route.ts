import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalConfig, saveGlobalConfig, clearGlobalConfig } from '@/lib/config';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  const config = loadGlobalConfig();
  return NextResponse.json({
    configured: config !== null,
    kibanaUrl: config?.kibanaUrl ?? '',
    workflowId: config?.workflowId ?? '',
    huntEnabled: config?.huntEnabled ?? true,
    isEnvVar: Boolean(process.env.KIBANA_URL),
    authenticated: session !== null,
    username: session?.username,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { kibanaUrl, workflowId, huntEnabled } = await request.json() as { kibanaUrl: string; workflowId: string; huntEnabled?: boolean };
    if (!kibanaUrl || !workflowId) {
      return NextResponse.json({ error: 'Kibana URL and Workflow ID are required' }, { status: 400 });
    }
    saveGlobalConfig({ kibanaUrl: kibanaUrl.replace(/\/+$/, ''), workflowId, huntEnabled: huntEnabled ?? true });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE() {
  clearGlobalConfig();
  return NextResponse.json({ success: true });
}
