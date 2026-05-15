import { NextResponse } from 'next/server';
import { describeStorage, getStorage } from '@/lib/storage';

export async function GET() {
  const storage = describeStorage();
  const platform = process.env.VERCEL ? 'vercel'
    : process.env.NETLIFY ? 'netlify'
    : process.env.CF_PAGES ? 'cloudflare-pages'
    : process.env.AWS_LAMBDA_FUNCTION_NAME ? 'aws-lambda'
    : 'self-hosted';

  // Best-effort ping to confirm the configured storage actually works
  let storageOk: boolean | null = null;
  let storageError: string | null = null;
  try {
    const s = getStorage();
    const probeKey = '__diagnostic_probe__';
    await s.set(probeKey, String(Date.now()));
    const value = await s.get(probeKey);
    await s.del(probeKey);
    storageOk = value !== null;
  } catch (err) {
    storageOk = false;
    storageError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    platform,
    storage: storage.kind,
    storageSource: storage.source ?? null,
    storageOk,
    storageError,
    hasKibanaUrlEnv: Boolean(process.env.KIBANA_URL),
    hasWorkflowIdEnv: Boolean(process.env.WORKFLOW_ID),
    hasConfigSecret: Boolean(process.env.CONFIG_SECRET),
  });
}
