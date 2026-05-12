import { NextResponse } from 'next/server';
import { loadGlobalConfig } from '@/lib/config';
import { getSession, getAuthHeader } from '@/lib/session';

interface ExecSummary {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  executedBy?: string;
}

export async function GET() {
  const config = await loadGlobalConfig();
  const session = await getSession();

  if (!config?.kibanaUrl || !config?.workflowId) {
    return NextResponse.json({ error: 'Not configured' }, { status: 400 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const headers: Record<string, string> = { 'kbn-xsrf': 'true', 'Content-Type': 'application/json', 'Authorization': getAuthHeader(session) };

  try {
    const listRes = await fetch(`${config.kibanaUrl}/api/workflows/workflow/${config.workflowId}/executions?size=100`, { headers });
    if (!listRes.ok) throw new Error(`Kibana: ${listRes.status}`);
    const listData = await listRes.json();
    const allExecs: ExecSummary[] = listData.results ?? [];

    const completedIds = allExecs.filter(e => e.status === 'completed').map(e => e.id);

    const outputs = await Promise.allSettled(
      completedIds.slice(0, 50).map(async (id) => {
        const r = await fetch(`${config.kibanaUrl}/api/workflows/executions/${id}?includeOutput=true`, { headers });
        if (!r.ok) return null;
        const data = await r.json();
        const steps: Record<string, unknown>[] = data.stepExecutions ?? [];
        const formatReport = steps.find(
          (s: Record<string, unknown>) => s.stepId === 'format_report' && s.output
        );
        return { id, output: formatReport?.output ?? null, steps };
      })
    );

    const verdictMap: Record<string, Record<string, unknown>> = {};
    const stepsMap: Record<string, Record<string, unknown>[]> = {};
    for (const r of outputs) {
      if (r.status === 'fulfilled' && r.value) {
        if (r.value.output) verdictMap[r.value.id] = r.value.output as Record<string, unknown>;
        stepsMap[r.value.id] = r.value.steps;
      }
    }

    let totalAnalyses = allExecs.length;
    let completed = 0, failed = 0, running = 0, cancelled = 0;
    let threats = 0, safe = 0;
    let totalDuration = 0, durationCount = 0;
    let totalInputTokens = 0, totalOutputTokens = 0, totalCost = 0;
    let hunted = 0;
    let autoHunted = 0, hitlApproved = 0, hitlSkipped = 0, noHunt = 0;
    const userCounts: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};
    const dailyCounts: Record<string, { total: number; threats: number }> = {};

    for (const exec of allExecs) {
      switch (exec.status) {
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'running': case 'pending': running++; break;
        case 'cancelled': cancelled++; break;
      }

      if (exec.duration) { totalDuration += exec.duration; durationCount++; }
      if (exec.executedBy) { userCounts[exec.executedBy] = (userCounts[exec.executedBy] ?? 0) + 1; }

      const day = exec.startedAt ? exec.startedAt.slice(0, 10) : 'unknown';
      if (!dailyCounts[day]) dailyCounts[day] = { total: 0, threats: 0 };
      dailyCounts[day].total++;

      const output = verdictMap[exec.id];
      if (output) {
        const isThreat = output.classification_is_phishing === 'true' || output.classification_is_phishing === true;
        if (isThreat) { threats++; dailyCounts[day].threats++; } else { safe++; }

        const cType = (output.classification_type as string) ?? 'unknown';
        typeBreakdown[cType] = (typeBreakdown[cType] ?? 0) + 1;

        const huntResults = output.hunt_results as string | undefined;
        if (huntResults && !huntResults.startsWith('No hunt')) {
          hunted++;
        }

        const steps = stepsMap[exec.id] ?? [];
        const hasAutoHunt = steps.some((s: Record<string, unknown>) => s.stepId === 'hunt_in_environment' && s.status === 'completed');
        const hasAskApproval = steps.some((s: Record<string, unknown>) => s.stepId === 'ask_hunt_approval' && s.status === 'completed');
        const hasHuntAfterApproval = steps.some((s: Record<string, unknown>) => s.stepId === 'hunt_in_environment_after_approval' && s.status === 'completed');

        if (hasAutoHunt) {
          autoHunted++;
        } else if (hasAskApproval && hasHuntAfterApproval) {
          hitlApproved++;
        } else if (hasAskApproval && !hasHuntAfterApproval) {
          hitlSkipped++;
          noHunt++;
        } else {
          noHunt++;
        }

        const costData = output.ai_cost_tracking as Record<string, Record<string, string>> | undefined;
        if (costData) {
          for (const step of Object.values(costData)) {
            const inputTk = parseInt(step.input_tokens ?? '0', 10) || 0;
            const outputTk = parseInt(step.output_tokens ?? '0', 10) || 0;
            totalInputTokens += inputTk;
            totalOutputTokens += outputTk;
            totalCost += (inputTk / 1_000_000) * 15 + (outputTk / 1_000_000) * 75;
          }
        }
      }
    }

    const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    const manualMinutesPerAnalysis = 45;
    const estimatedTimeSavedMinutes = completed * manualMinutesPerAnalysis;

    const topUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]).map(([user, count]) => ({ user, count }));

    return NextResponse.json({
      totalAnalyses,
      completed,
      failed,
      running,
      cancelled,
      threats,
      safe,
      avgDurationMs: Math.round(avgDuration),
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalInputTokens,
      totalOutputTokens,
      topUsers,
      typeBreakdown,
      dailyCounts: Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b)).map(([date, c]) => ({ date, ...c })),
      estimatedTimeSavedMinutes,
      flowData: {
        total: totalAnalyses,
        completed,
        failed,
        phishing_email: typeBreakdown['phishing_email'] ?? 0,
        smishing: typeBreakdown['smishing'] ?? 0,
        spam: typeBreakdown['spam'] ?? 0,
        legitimate: typeBreakdown['legitimate'] ?? 0,
        unknown: typeBreakdown['unknown'] ?? 0,
        autoHunted,
        hitlApproved,
        hitlSkipped,
        noHunt,
        hunted,
        not_hunted: noHunt,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
