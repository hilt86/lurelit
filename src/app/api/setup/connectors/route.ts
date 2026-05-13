import { NextResponse } from 'next/server';
import { kibanaHeadersFromPayload, type AuthMode } from '@/lib/kibana-auth';

interface ConnectorRequest {
  kibanaUrl: string;
  authMode?: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
  action: 'check' | 'create';
  connectorType?: string;
  credentials?: {
    apiKey?: string;
    webhookUrl?: string;
  };
}

interface ConnectorStatus {
  id: string;
  name: string;
  found: boolean;
  connectorId?: string;
  connectorType?: string;
  url?: string;
  headers?: Record<string, string>;
}

interface InferenceConnector {
  id: string;
  name: string;
  connectorTypeId: string;
}

const REQUIRED_CONNECTORS = [
  { id: 'anthropic-api', name: 'Anthropic API', matchType: 'id_or_url', url: 'https://api.anthropic.com/v1/messages' },
  { id: 'vt-url', name: 'VT URL', matchType: 'id_or_url', url: 'https://www.virustotal.com/api/v3/urls' },
  { id: 'vt-base', name: 'VT Base', matchType: 'id_or_url', url: 'https://www.virustotal.com/api/v3' },
  { id: 'vt-files', name: 'VT - Files', matchType: 'id_or_url', url: 'https://www.virustotal.com/api/v3/files' },
  { id: 'url-scan-search', name: 'URL Scan - Search', matchType: 'id_or_url', url: 'https://urlscan.io/api/v1/search/' },
  { id: 'slack-post-message', name: 'Slack Post Message', matchType: 'id_or_url', url: 'https://slack.com/api/chat.postMessage' },
  { id: 'virustotal-native', name: 'VirusTotal (Native)', matchType: 'connector_type', connectorTypeId: '.virustotal' },
];

const INFERENCE_CONNECTOR_TYPES = new Set(['.inference', '.gen-ai', '.bedrock', '.gemini']);

function maskHeaderValue(key: string, value: string): string {
  const lowerKey = key.toLowerCase();
  const sensitive = ['x-api-key', 'x-apikey', 'api-key', 'authorization', 'token'];
  if (sensitive.some(s => lowerKey.includes(s))) {
    if (value.length <= 8) return '••••';
    return value.slice(0, 4) + '••••' + value.slice(-4);
  }
  return value;
}

async function checkConnectors(
  kibanaUrl: string,
  headers: Record<string, string>
): Promise<{ statuses: ConnectorStatus[]; inferenceConnectors: InferenceConnector[]; inferenceAvailable: boolean }> {
  const res = await fetch(`${kibanaUrl}/api/actions/connectors`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to list connectors: ${res.status}`);
  }

  const existing = await res.json() as Array<{
    id: string;
    name: string;
    connector_type_id: string;
    config?: { url?: string; headers?: Record<string, string> | null; [key: string]: unknown };
  }>;

  const statuses = REQUIRED_CONNECTORS.map(req => {
    let match: typeof existing[number] | undefined;

    if (req.matchType === 'connector_type') {
      match = existing.find(c => c.connector_type_id === req.connectorTypeId);
    } else if (req.matchType === 'id_or_name') {
      match = existing.find(c => c.id === req.id || c.name.toLowerCase() === req.name.toLowerCase());
    } else {
      match = existing.find(
        c => c.id === req.id || c.name.toLowerCase() === req.name.toLowerCase() || (req.url && c.config?.url === req.url)
      );
    }

    const maskedHeaders: Record<string, string> | undefined =
      match?.config?.headers
        ? Object.fromEntries(
            Object.entries(match.config.headers).map(([k, v]) => [k, maskHeaderValue(k, v)])
          )
        : undefined;

    return {
      id: req.id,
      name: req.name,
      found: !!match,
      connectorId: match?.id,
      connectorType: match?.connector_type_id,
      url: match?.config?.url as string | undefined,
      headers: maskedHeaders,
    };
  });

  const inferenceConnectors: InferenceConnector[] = existing
    .filter(c => INFERENCE_CONNECTOR_TYPES.has(c.connector_type_id))
    .map(c => ({
      id: c.id,
      name: c.name,
      connectorTypeId: c.connector_type_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { statuses, inferenceConnectors, inferenceAvailable: inferenceConnectors.length > 0 };
}

async function createConnector(
  kibanaUrl: string,
  headers: Record<string, string>,
  connectorType: string,
  credentials: { apiKey?: string; webhookUrl?: string }
): Promise<{ success: boolean; connectorId?: string; error?: string }> {
  const spec = REQUIRED_CONNECTORS.find(c => c.id === connectorType);
  if (!spec) {
    return { success: false, error: `Unknown connector type: ${connectorType}` };
  }

  if (spec.connectorTypeId && spec.connectorTypeId !== '.http' && spec.connectorTypeId !== '.virustotal') {
    return { success: false, error: `Cannot create ${spec.connectorTypeId} connectors via this wizard — configure in Kibana directly` };
  }

  let body: Record<string, unknown>;

  if (spec.connectorTypeId === '.virustotal') {
    body = {
      connector_type_id: '.virustotal',
      name: spec.name,
      config: { authType: 'api_key_header' },
      secrets: { authType: 'api_key_header', 'x-apikey': credentials.apiKey || '' },
    };
  } else {
    body = {
      connector_type_id: '.http',
      name: spec.name,
      config: {
        url: spec.url,
        hasAuth: false,
        authType: null,
        headers: null,
      },
      secrets: {},
    };
  }

  if (connectorType === 'anthropic-api') {
    body.config = {
      url: spec.url,
      hasAuth: false,
      authType: null,
      headers: null,
      proxyUrl: null,
      hasProxyAuth: false,
    };
    body.secrets = {
      secretHeaders: { 'x-api-key': credentials.apiKey || '' },
      proxyUsername: null,
      proxyPassword: null,
    };
  } else if (connectorType.startsWith('vt-')) {
    body.config = {
      url: spec.url,
      hasAuth: false,
      authType: null,
      headers: null,
      proxyUrl: null,
      hasProxyAuth: false,
    };
    body.secrets = {
      secretHeaders: { 'x-apikey': credentials.apiKey || '' },
      proxyUsername: null,
      proxyPassword: null,
    };
  } else if (connectorType === 'url-scan-search') {
    body.config = {
      url: spec.url,
      hasAuth: false,
      authType: null,
      headers: null,
      proxyUrl: null,
      hasProxyAuth: false,
    };
    body.secrets = {
      secretHeaders: { 'API-Key': credentials.apiKey || '' },
      proxyUsername: null,
      proxyPassword: null,
    };
  } else if (connectorType === 'slack-post-message') {
    body.config = {
      url: spec.url,
      hasAuth: false,
      authType: null,
      headers: null,
      proxyUrl: null,
      hasProxyAuth: false,
    };
    body.secrets = {
      secretHeaders: { 'Authorization': `Bearer ${credentials.apiKey || ''}` },
      proxyUsername: null,
      proxyPassword: null,
    };
  }

  const res = await fetch(`${kibanaUrl}/api/actions/connector`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = (errData as { message?: string }).message || `HTTP ${res.status}`;
    return { success: false, error: msg };
  }

  const data = await res.json() as { id: string };
  return { success: true, connectorId: data.id };
}

export async function POST(request: Request) {
  try {
    const body: ConnectorRequest = await request.json();
    const { kibanaUrl, authMode = 'basic', username, password, apiKey, action, connectorType, credentials } = body;

    if (!kibanaUrl || (authMode === 'api_key' ? !apiKey : !username || !password)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedUrl = kibanaUrl.trim().replace(/\/+$/, '');
    const headers = kibanaHeadersFromPayload({ authMode, username, password, apiKey });

    if (action === 'check') {
      const { statuses, inferenceConnectors, inferenceAvailable } = await checkConnectors(normalizedUrl, headers);
      return NextResponse.json({ connectors: statuses, inferenceConnectors, inferenceAvailable });
    }

    if (action === 'create') {
      if (!connectorType || !credentials) {
        return NextResponse.json({ error: 'Missing connectorType or credentials' }, { status: 400 });
      }
      const result = await createConnector(normalizedUrl, headers, connectorType, credentials);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
