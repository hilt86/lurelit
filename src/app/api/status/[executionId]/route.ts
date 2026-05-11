import { NextRequest, NextResponse } from 'next/server';
import { getExecution, getExecutionLogs } from '@/lib/elastic';
import { isDemoExecution, getDemoStatus } from '@/lib/demo';
import type { WorkflowStatus, StepExecution, LogEntry, EnrichmentDetail, EnrichmentSource } from '@/lib/types';

const HIDDEN_STEP_TYPES = new Set(['if', 'console', 'step_level_timeout']);

const STEP_LABELS: Record<string, string> = {
  analyze_screenshot: 'AI Screenshot Analysis',
  parse_analysis: 'Parse Analysis Results',
  enrich_iocs: 'IOC Enrichment',
  enrich_urls: 'URL Enrichment',
  enrich_domains: 'Domain Enrichment',
  enrich_hashes: 'Hash Enrichment',
  enrich_ips: 'IP Enrichment',
  summarize_enrichment: 'Enrichment Summary',
  ask_hunt_approval: 'Hunt Approval Required',
  hunt_in_environment: 'Environment Threat Hunt',
  hunt_in_environment_after_approval: 'Environment Threat Hunt',
  format_report: 'Generate Final Report',
};

const STEP_ORDER = [
  'analyze_screenshot', 'parse_analysis',
  'enrich_iocs', 'enrich_urls', 'enrich_domains', 'enrich_hashes', 'enrich_ips',
  'summarize_enrichment', 'ask_hunt_approval', 'hunt_in_environment', 'hunt_in_environment_after_approval', 'format_report',
];

interface RawStep {
  id: string;
  stepId: string;
  stepType: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  output?: Record<string, unknown>;
  scopeStack?: { stepId: string }[];
  with?: { message?: string; schema?: Record<string, unknown> };
  [key: string]: unknown;
}

function isHiddenStep(sid: string, sType: string, scopeStack?: { stepId: string }[]): boolean {
  if (HIDDEN_STEP_TYPES.has(sType)) return true;
  if (sType === 'ai.prompt') return true;
  if (sid.startsWith('if_')) return true;
  if (sid.startsWith('log_')) return true;
  if (sid.startsWith('get_')) return true;
  if (sid.startsWith('filter_')) return true;
  if (sid.startsWith('set_')) return true;
  if (sid.startsWith('check_')) return true;
  if (sid.startsWith('wait_')) return true;
  if (sid.endsWith('_router')) return true;
  if (sid.startsWith('parse_') && sid !== 'parse_analysis') return true;
  if (sid.includes('slack')) return true;
  if (sid === 'format_slack_message' || sid === 'send_slack_report') return true;
  if (sType === 'console') return true;
  if (sType === 'kibana.request') return true;
  if (sType === 'data.filter') return true;
  if (sType === 'data.parseJson' && sid !== 'parse_analysis') return true;
  if (sType === 'data.set' && sid !== 'format_report') return true;
  if (scopeStack && scopeStack.some(s => s.stepId.startsWith('enrich_') || s.stepId === 'enrich_iocs')) return true;
  return false;
}

function prettifyStepId(sid: string): string {
  return sid
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  const includeScreenshot = request.nextUrl.searchParams.get('screenshot') !== 'false';

  if (isDemoExecution(executionId)) {
    const status = getDemoStatus(executionId);
    if (!status) return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    return NextResponse.json(status);
  }

  try {
    const [execution, logsData] = await Promise.all([
      getExecution(executionId, true),
      getExecutionLogs(executionId, 100).catch(() => ({ data: [] })),
    ]);

    const logs: LogEntry[] = (logsData.data ?? []).map(
      (l: Record<string, unknown>) => ({
        timestamp: l.timestamp as string,
        level: l.level as string,
        message: l.message as string,
        stepExecutionId: l.stepExecutionId as string | undefined,
      })
    );

    const rawSteps: RawStep[] = execution.stepExecutions ?? execution.steps ?? [];

    const grouped = new Map<string, StepExecution>();
    for (const s of rawSteps) {
      const sid = s.stepId;
      const sType = s.stepType ?? '';

      if (isHiddenStep(sid, sType, s.scopeStack)) continue;

      const existing = grouped.get(sid);
      const finished = s.finishedAt ?? (s as Record<string, unknown>).completedAt as string | undefined;
      const hasRealOutput = s.output && typeof s.output === 'object' && !('conditionResult' in s.output);

      if (!existing) {
        grouped.set(sid, {
          id: s.id,
          stepId: sid,
          name: STEP_LABELS[sid] ?? prettifyStepId(sid),
          status: mapStatus(s.status),
          startedAt: s.startedAt,
          completedAt: finished,
          output: hasRealOutput ? s.output as Record<string, unknown> : undefined,
          logs: logs.filter(l => l.stepExecutionId === s.id),
          waitingMessage: (sType === 'waitForInput' && mapStatus(s.status) === 'waiting') ? s.with?.message : undefined,
          waitingSchema: (sType === 'waitForInput' && mapStatus(s.status) === 'waiting') ? s.with?.schema : undefined,
        });
      } else {
        if (hasRealOutput) existing.output = s.output as Record<string, unknown>;
        if (finished && (!existing.completedAt || new Date(finished) > new Date(existing.completedAt))) {
          existing.completedAt = finished;
        }
        if (s.status === 'running' || (s.status === 'completed' && existing.status !== 'completed')) {
          existing.status = mapStatus(s.status);
        }
        if (sType === 'waitForInput' && mapStatus(s.status) === 'waiting') {
          existing.status = 'waiting';
          existing.waitingMessage = s.with?.message;
          existing.waitingSchema = s.with?.schema;
        }
        existing.logs = [...(existing.logs ?? []), ...logs.filter(l => l.stepExecutionId === s.id)];
      }
    }

    const steps: StepExecution[] = [];
    const added = new Set<string>();

    for (const sid of STEP_ORDER) {
      const step = grouped.get(sid);
      if (step) { steps.push(step); added.add(sid); }
    }
    for (const [sid, step] of grouped) {
      if (!added.has(sid)) steps.push(step);
    }

    const formatReport = grouped.get('format_report');
    const workflowOutput = formatReport?.output ?? execution.output;

    const iocs = workflowOutput?.iocs_found
      ? parseIocsField(workflowOutput.iocs_found)
      : [];
    const enrichmentDetails = extractEnrichmentDetails(rawSteps, iocs);

    const ctx = execution.context ?? {};
    const inputs = ctx.inputs ?? {};
    const imageBase64 = inputs.image_base64 as string | undefined;
    const mediaType = (inputs.media_type as string) ?? 'image/png';

    const wfDef = execution.workflowDefinition ?? {};
    const wfSteps = (wfDef.steps ?? []) as { name: string; type: string; 'connector-id'?: string; with?: { message?: string; schema?: Record<string, unknown> } }[];
    const HIDDEN_DEF_TYPES = new Set(['console', 'kibana.request', 'data.filter', 'data.parseJson']);
    const totalSteps = wfSteps.filter(s => !HIDDEN_DEF_TYPES.has(s.type) && !s.name.startsWith('log_') && !s.name.startsWith('get_') && !s.name.startsWith('filter_') && !s.name.startsWith('parse_')).length;

    // Hydrate waitingMessage/schema from workflow definition if not on the step execution itself
    function findStepInDef(stepsList: Record<string, unknown>[], name: string): Record<string, unknown> | undefined {
      for (const s of stepsList) {
        if ((s as {name?: string}).name === name) return s;
        if (Array.isArray(s.steps)) {
          const found = findStepInDef(s.steps as Record<string, unknown>[], name);
          if (found) return found;
        }
        if (Array.isArray((s as Record<string, unknown>).else)) {
          const found = findStepInDef((s as Record<string, unknown>).else as Record<string, unknown>[], name);
          if (found) return found;
        }
      }
      return undefined;
    }

    for (const step of steps) {
      if (step.status === 'waiting' && !step.waitingMessage) {
        const defStep = findStepInDef(wfSteps as unknown as Record<string, unknown>[], step.stepId);
        if (defStep && (defStep as Record<string, unknown>).with) {
          const w = (defStep as Record<string, unknown>).with as { message?: string; schema?: Record<string, unknown> };
          let msg = w.message ?? '';
          // Resolve template variables from step execution outputs
          msg = resolveTemplateVars(msg, rawSteps);
          step.waitingMessage = msg;
          step.waitingSchema = w.schema;
        }
      }
    }

    // Extract connector IDs for AI steps to help with cost model resolution
    if (workflowOutput?.ai_cost_tracking && typeof workflowOutput.ai_cost_tracking === 'object') {
      const costTracking = workflowOutput.ai_cost_tracking as Record<string, Record<string, unknown>>;
      for (const step of wfSteps) {
        if (step['connector-id'] && costTracking[step.name]) {
          costTracking[step.name].connector_id = step['connector-id'];
        }
      }
    }

    const rawStatus = mapStatus(execution.status);
    const hasActiveSteps = steps.some(s => s.status === 'running');
    const effectiveStatus = (rawStatus === 'waiting' && hasActiveSteps) ? 'running' : rawStatus;

    const isAwaitingInput = rawStatus === 'waiting' &&
      !hasActiveSteps &&
      rawSteps.some(s => s.stepType === 'waitForInput' && (s.status === 'waiting_for_input' || s.status === 'waiting'));

    const response: WorkflowStatus = {
      executionId,
      status: effectiveStatus,
      steps,
      output: workflowOutput,
      startedAt: execution.startedAt,
      completedAt: execution.finishedAt ?? execution.completedAt,
      screenshot: includeScreenshot && imageBase64 ? `data:${mediaType};base64,${imageBase64}` : undefined,
      mediaType,
      executedBy: execution.executedBy,
      enrichmentDetails: enrichmentDetails.length > 0 ? enrichmentDetails : undefined,
      totalSteps: totalSteps > 0 ? totalSteps : undefined,
      isAwaitingInput,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Status error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function resolveTemplateVars(msg: string, rawSteps: RawStep[]): string {
  // Build a lookup of step outputs: steps.{stepId}.output.{path}
  const stepOutputs: Record<string, Record<string, unknown>> = {};
  for (const s of rawSteps) {
    if (s.output && typeof s.output === 'object') {
      if (!stepOutputs[s.stepId] || Object.keys(s.output).length > Object.keys(stepOutputs[s.stepId] ?? {}).length) {
        stepOutputs[s.stepId] = s.output as Record<string, unknown>;
      }
    }
  }

  // Replace {{ steps.X.output.Y }} patterns
  return msg.replace(/\{\{\s*steps\.([a-z_]+)\.output\.([a-z_.\[\]0-9]+)\s*\}\}/gi, (_match, stepId, path) => {
    const output = stepOutputs[stepId];
    if (!output) return '';
    // Navigate the path (e.g., "summary" or "malicious_indicators[0].confidence")
    const parts = path.split('.');
    let val: unknown = output;
    for (const part of parts) {
      if (val == null) return '';
      const arrMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrMatch) {
        val = (val as Record<string, unknown>)[arrMatch[1]];
        if (Array.isArray(val)) val = val[parseInt(arrMatch[2])];
      } else {
        val = (val as Record<string, unknown>)[part];
      }
    }
    if (val == null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}

function mapStatus(raw: string): StepExecution['status'] {
  const s = (raw ?? '').toLowerCase();
  if (s === 'completed' || s === 'succeeded') return 'completed';
  if (s === 'running' || s === 'in_progress') return 'running';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'waiting_for_input' || s === 'waiting') return 'waiting';
  return 'pending';
}

function parseIocsField(val: unknown): { type: string; value: string }[] {
  if (Array.isArray(val)) return val as { type: string; value: string }[];
  if (typeof val !== 'string') return [];
  try { return JSON.parse(val); } catch { /* not JSON, try bullet format */ }
  return val.split('\n').map(line => {
    const m = line.match(/^•\s*`([^`]+)`\s*—\s*(.+)$/);
    if (!m) return null;
    return { type: m[1], value: m[2].trim() };
  }).filter((x): x is { type: string; value: string } => x !== null);
}

const VT_STEP_IDS = new Set(['vt_url_poll_check', 'vt_url_submit', 'vt_hash_lookup', 'vt_hash_check', 'vt_ip_lookup']);
const URLSCAN_STEP_IDS = new Set(['urlscan_url_search', 'urlscan_domain_search', 'urlscan_ip_search']);

function extractEnrichmentDetails(rawSteps: RawStep[], knownIocs: { type: string; value: string }[]): EnrichmentDetail[] {
  const iocMap = new Map<string, EnrichmentDetail>();

  const iocsByType: Record<string, string[]> = {};
  for (const ioc of knownIocs) {
    if (!iocsByType[ioc.type]) iocsByType[ioc.type] = [];
    iocsByType[ioc.type].push(ioc.value);
  }

  const foreachCounters: Record<string, number> = {};

  for (const s of rawSteps) {
    const sid = s.stepId;
    const output = s.output;
    if (!output || typeof output !== 'object') continue;

    const scope = s.scopeStack ?? [];
    const foreachScope = scope.find(sc => (sc.stepId ?? '').startsWith('enrich_'));
    if (!foreachScope) continue;

    const enrichType = (foreachScope as { stepId: string }).stepId;
    const iocType =
      enrichType === 'enrich_urls' ? 'url'
      : enrichType === 'enrich_domains' ? 'domain'
      : enrichType === 'enrich_hashes' ? 'hash'
      : enrichType === 'enrich_ips' ? 'ip'
      : null;
    if (!iocType) continue;

    const scopeKey = JSON.stringify(scope);

    if (VT_STEP_IDS.has(sid)) {
      const data = (output as Record<string, unknown>).data as Record<string, unknown> | undefined;
      if (!data) continue;

      const inner = (data.data ?? data) as Record<string, unknown>;
      const attrs = (inner.attributes ?? {}) as Record<string, unknown>;
      const stats = attrs.stats ?? attrs.last_analysis_stats;
      const vtUrl = (attrs.url ?? '') as string;

      let iocValue = vtUrl;
      if (!iocValue && iocsByType[iocType]?.length) {
        if (!foreachCounters[`vt_${iocType}`]) foreachCounters[`vt_${iocType}`] = 0;
        const idx = foreachCounters[`vt_${iocType}`];
        iocValue = iocsByType[iocType][idx] ?? `${iocType}:unknown`;
      }
      if (!iocValue) iocValue = `${iocType}:${s.id.slice(0, 8)}`;

      const vtStats = stats as { malicious?: number; suspicious?: number; harmless?: number; undetected?: number } | undefined;
      const vtStatus: EnrichmentSource['status'] =
        (vtStats?.malicious ?? 0) > 0 ? 'malicious' : (vtStats?.suspicious ?? 0) > 0 ? 'suspicious' : vtStats ? 'clean' : 'unknown';

      if (!iocMap.has(iocValue)) {
        iocMap.set(iocValue, { iocType, iocValue, sources: [] });
      }
      const detail = iocMap.get(iocValue)!;
      if (!detail.sources.some(src => src.name === 'VirusTotal') && vtStats) {
        detail.sources.push({
          name: 'VirusTotal',
          status: vtStatus,
          stats: { malicious: vtStats.malicious ?? 0, suspicious: vtStats.suspicious ?? 0, harmless: vtStats.harmless ?? 0, undetected: vtStats.undetected ?? 0 },
        });
      }
    }

    if (URLSCAN_STEP_IDS.has(sid)) {
      const data = (output as Record<string, unknown>).data as Record<string, unknown> | undefined;
      if (!data) continue;

      const results = (data.results ?? []) as unknown[];
      const total = (data.total ?? results.length) as number;

      if (!foreachCounters[`us_${iocType}_${scopeKey}`]) {
        foreachCounters[`us_${iocType}_${scopeKey}`] = 1;
      }

      let iocValue = '';
      if (iocsByType[iocType]?.length) {
        if (!foreachCounters[`uscan_${iocType}`]) foreachCounters[`uscan_${iocType}`] = 0;
        const idx = foreachCounters[`uscan_${iocType}`];
        iocValue = iocsByType[iocType][idx] ?? '';
        foreachCounters[`uscan_${iocType}`]++;
      }
      if (!iocValue) iocValue = `${iocType}:${sid}`;

      if (!iocMap.has(iocValue)) {
        iocMap.set(iocValue, { iocType, iocValue, sources: [] });
      }
      const detail = iocMap.get(iocValue)!;
      if (!detail.sources.some(src => src.name === 'urlscan.io')) {
        detail.sources.push({
          name: 'urlscan.io',
          status: total > 0 ? 'malicious' : 'no_results',
          resultsCount: total,
        });
      }
    }
  }

  for (const ioc of knownIocs) {
    if (!iocMap.has(ioc.value)) {
      iocMap.set(ioc.value, { iocType: ioc.type, iocValue: ioc.value, sources: [] });
    }
  }

  return Array.from(iocMap.values());
}
