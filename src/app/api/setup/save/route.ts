import { NextResponse } from 'next/server';
import { saveGlobalConfig } from '@/lib/config';
import { shouldUseSecureCookies } from '@/lib/cookies';

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

    const cleanedUrl = kibanaUrl.trim().replace(/\/+$/, '');

    // Reject localhost on serverless platforms — the function container can never reach it
    const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(:\d+)?(\/|$)/i.test(cleanedUrl);
    if (isServerless && isLocalhostUrl) {
      return NextResponse.json({
        error: `"${cleanedUrl}" can't be reached from a serverless deployment. Use the public URL of your Kibana or Elastic Cloud project (e.g. https://your-deployment.kb.region.elastic-cloud.com).`,
      }, { status: 400 });
    }

    // Warn if running on a serverless platform without Upstash Redis — config will not persist
    if (isServerless && !process.env.UPSTASH_REDIS_REST_URL) {
      console.warn('[Lurelit] Running on a serverless platform without UPSTASH_REDIS_REST_URL — config will not persist across cold starts. Add Upstash Redis from the Vercel Marketplace.');
    }

    await saveGlobalConfig({
      kibanaUrl: cleanedUrl,
      workflowId,
      huntEnabled: true,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('smish_configured', '1', {
      httpOnly: false,
      secure: shouldUseSecureCookies(request),
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
