import { NextResponse, NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { kibanaHeadersFromPayload, type AuthMode } from '@/lib/kibana-auth';

interface WorkflowRequest {
  kibanaUrl: string;
  authMode?: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
  action: 'list' | 'create';
  connectorIds?: Record<string, string>;
}

interface KibanaWorkflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  connectorIds?: Record<string, string>;
}

async function listWorkflows(
  kibanaUrl: string,
  headers: Record<string, string>
): Promise<{ workflows: KibanaWorkflow[] }> {
  const res = await fetch(`${kibanaUrl}/api/workflows?size=100`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to list workflows: ${res.status}`);
  }

  const data = await res.json() as {
    results: Array<{
      id: string;
      name: string;
      description: string;
      enabled: boolean;
    }>;
  };

  const workflows: KibanaWorkflow[] = await Promise.all(
    data.results.map(async (w) => {
      const base: KibanaWorkflow = {
        id: w.id,
        name: w.name,
        description: w.description || '',
        enabled: w.enabled,
      };

      const isLurelit = w.name.toLowerCase().includes('phishing') ||
        w.name.toLowerCase().includes('smishing') ||
        w.name.toLowerCase().includes('lurelit');

      if (isLurelit) {
        try {
          const detailRes = await fetch(`${kibanaUrl}/api/workflows/workflow/${w.id}`, { headers });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            base.connectorIds = extractConnectorIds(detail);
          }
        } catch {
          // Non-critical — connector comparison is best-effort
        }
      }

      return base;
    })
  );

  return { workflows };
}

async function createWorkflow(
  kibanaUrl: string,
  headers: Record<string, string>,
  connectorIds?: Record<string, string>
): Promise<{ success: boolean; workflow?: KibanaWorkflow; error?: string }> {
  const yamlPath = join(process.cwd(), 'workflow', 'phishing-smishing-screenshot-analyzer.yaml');
  let yaml: string;

  try {
    yaml = readFileSync(yamlPath, 'utf8');
  } catch {
    return { success: false, error: 'Workflow YAML file not found on server' };
  }

  if (connectorIds) {
    for (const [placeholder, actualId] of Object.entries(connectorIds)) {
      yaml = yaml.replace(new RegExp(escapeRegex(placeholder), 'g'), actualId);
    }
  }

  const res = await fetch(`${kibanaUrl}/api/workflows/workflow`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ yaml }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = (errData as { message?: string }).message || `HTTP ${res.status}`;
    return { success: false, error: msg };
  }

  const data = await res.json() as {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  };

  return {
    success: true,
    workflow: {
      id: data.id,
      name: data.name,
      description: data.description || '',
      enabled: data.enabled,
    },
  };
}

interface WorkflowStep {
  name?: string;
  'connector-id'?: string;
  steps?: WorkflowStep[];
}

function extractConnectorIds(workflowDetail: { steps?: WorkflowStep[] }): Record<string, string> {
  const result: Record<string, string> = {};

  function walkSteps(steps: WorkflowStep[]) {
    for (const step of steps) {
      if (step.name && step['connector-id']) {
        result[step.name] = step['connector-id'];
      }
      if (step.steps) {
        walkSteps(step.steps);
      }
    }
  }

  if (workflowDetail.steps) {
    walkSteps(workflowDetail.steps);
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const opusOverride = searchParams.get('opusConnectorId');
  const sonnetOverride = searchParams.get('sonnetConnectorId');

  const yamlPath = join(process.cwd(), 'workflow', 'phishing-smishing-screenshot-analyzer.yaml');
  try {
    let yaml = readFileSync(yamlPath, 'utf8');
    if (opusOverride) {
      yaml = yaml.replace(
        /\.anthropic-claude-4\.6-opus-chat_completion/g,
        opusOverride
      );
    }
    if (sonnetOverride) {
      yaml = yaml.replace(
        /\.anthropic-claude-4\.6-sonnet-chat_completion/g,
        sonnetOverride
      );
    }
    return NextResponse.json({ yaml });
  } catch {
    return NextResponse.json({ error: 'Workflow YAML file not found' }, { status: 404 });
  }
}

export async function POST(request: Request) {
  try {
    const body: WorkflowRequest = await request.json();
    const { kibanaUrl, authMode = 'basic', username, password, apiKey, action, connectorIds } = body;

    if (!kibanaUrl || (authMode === 'api_key' ? !apiKey : !username || !password)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedUrl = kibanaUrl.trim().replace(/\/+$/, '');
    const headers = kibanaHeadersFromPayload({ authMode, username, password, apiKey });

    if (action === 'list') {
      const result = await listWorkflows(normalizedUrl, headers);
      return NextResponse.json(result);
    }

    if (action === 'create') {
      const result = await createWorkflow(normalizedUrl, headers, connectorIds);
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
