import { loadGlobalConfig } from './config';
import { getSession, getAuthHeader } from './session';
import { baseKibanaHeaders } from './kibana-auth';

async function getConfig() {
  return (await loadGlobalConfig()) ?? { kibanaUrl: '', workflowId: '' };
}

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'kbn-xsrf': 'true' };
  const session = await getSession();
  if (session) {
    h['Authorization'] = getAuthHeader(session);
  }
  return h;
}

export async function isConfigured(): Promise<boolean> {
  const c = await getConfig();
  return Boolean(c.kibanaUrl && c.workflowId);
}

export async function runWorkflow(inputs: Record<string, unknown>) {
  const config = await getConfig();
  const res = await fetch(`${config.kibanaUrl}/api/workflows/workflow/${config.workflowId}/run`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ inputs, metadata: { source: 'smish-analyzer', submitted_at: new Date().toISOString() } }),
  });
  if (!res.ok) throw new Error(`Failed to run workflow: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getExecution(executionId: string, includeOutput = true) {
  const config = await getConfig();
  const params = new URLSearchParams();
  if (includeOutput) params.set('includeOutput', 'true');
  const res = await fetch(`${config.kibanaUrl}/api/workflows/executions/${executionId}?${params}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`Failed to get execution: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getExecutionLogs(executionId: string, size = 100) {
  const config = await getConfig();
  const params = new URLSearchParams({ size: String(size), sortField: 'timestamp', sortOrder: 'asc' });
  const res = await fetch(`${config.kibanaUrl}/api/workflows/executions/${executionId}/logs?${params}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`Failed to get execution logs: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const { kibanaUrl } = await getConfig();
  if (!kibanaUrl) return { ok: false, message: 'Missing Kibana URL' };
  try {
    const res = await fetch(`${kibanaUrl}/api/status`, { headers: await authHeaders() });
    if (res.ok) return { ok: true, message: 'Connected to Kibana' };
    if (res.status === 401) return { ok: false, message: 'Authentication failed' };
    return { ok: false, message: `Kibana returned ${res.status}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' };
  }
}

export async function validateCredentials(kibanaUrl: string, username: string, password: string): Promise<{ ok: boolean; message: string }> {
  return validateAuthHeader(kibanaUrl, `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`);
}

export async function validateApiKey(kibanaUrl: string, apiKey: string): Promise<{ ok: boolean; message: string }> {
  return validateAuthHeader(kibanaUrl, `ApiKey ${apiKey.trim()}`);
}

export async function resolveCurrentUser(kibanaUrl: string, authHeader: string): Promise<string | null> {
  try {
    const res = await fetch(`${kibanaUrl}/internal/security/me`, {
      headers: baseKibanaHeaders(authHeader, false),
    });
    if (!res.ok) return null;
    const data = await res.json() as { username?: string; full_name?: string; email?: string; authentication_provider?: { name?: string } };
    return data.username || data.email || data.full_name || null;
  } catch {
    return null;
  }
}

async function validateAuthHeader(kibanaUrl: string, authHeader: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${kibanaUrl}/api/status`, {
      headers: baseKibanaHeaders(authHeader, false),
    });
    if (res.ok) return { ok: true, message: 'Authenticated' };
    if (res.status === 401) return { ok: false, message: 'Invalid credentials' };
    return { ok: false, message: `Kibana returned ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    const cause = err instanceof Error && err.cause ? ` — ${err.cause}` : '';
    return { ok: false, message: `${msg}${cause}. Check that the Kibana URL (${kibanaUrl}) is reachable from this container.` };
  }
}
