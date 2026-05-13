import { NextRequest, NextResponse } from 'next/server';
import { getExecution } from '@/lib/elastic';
import { getSession } from '@/lib/session';

function getScreenshotDataUrl(inputs: Record<string, unknown> | undefined): string | null {
  const image = typeof inputs?.image_base64 === 'string' ? inputs.image_base64 : '';
  if (!image) return null;
  if (image.startsWith('data:image/')) return image;

  const mediaType =
    typeof inputs?.media_type === 'string' && inputs.media_type.startsWith('image/')
      ? inputs.media_type
      : 'image/png';

  return `data:${mediaType};base64,${image}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { executionId } = await params;

  try {
    const execution = await getExecution(executionId, false);
    const context = execution.context as { inputs?: Record<string, unknown> } | undefined;

    return NextResponse.json({
      screenshot: getScreenshotDataUrl(context?.inputs),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load thumbnail' },
      { status: 500 }
    );
  }
}
