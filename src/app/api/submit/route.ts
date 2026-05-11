import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow, isConfigured } from '@/lib/elastic';
import { loadGlobalConfig } from '@/lib/config';
import { createDemoExecution } from '@/lib/demo';

function detectMediaType(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/jpeg')) return 'image/jpeg';
  if (dataUrl.startsWith('data:image/jpg')) return 'image/jpeg';
  if (dataUrl.startsWith('data:image/webp')) return 'image/webp';
  if (dataUrl.startsWith('data:image/gif')) return 'image/gif';
  return 'image/png';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body as { image: string };

    if (!image) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    if (image === '__demo__' || !isConfigured()) {
      const executionId = createDemoExecution();
      return NextResponse.json({ executionId });
    }

    const mediaType = detectMediaType(image);
    const base64 = image.includes(',') ? image.split(',')[1] : image;
    const config = loadGlobalConfig();

    const result = await runWorkflow({
      image_base64: base64,
      media_type: mediaType,
      hunt_enabled: config?.huntEnabled ?? true,
    });

    return NextResponse.json({ executionId: result.workflowExecutionId ?? result.id ?? result.executionId });
  } catch (err) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
