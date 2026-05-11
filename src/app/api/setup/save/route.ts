import { NextResponse } from 'next/server';
import { saveGlobalConfig } from '@/lib/config';

interface SaveRequest {
  kibanaUrl: string;
  workflowId: string;
}

export async function POST(request: Request) {
  try {
    const body: SaveRequest = await request.json();
    const { kibanaUrl, workflowId } = body;

    if (!kibanaUrl || !workflowId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    saveGlobalConfig({
      kibanaUrl: kibanaUrl.replace(/\/+$/, ''),
      workflowId,
      huntEnabled: true,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('smish_configured', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 5,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save config' },
      { status: 500 }
    );
  }
}
