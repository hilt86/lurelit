'use client';

interface CostTrackingData {
  [stepName: string]: {
    model?: string;
    connector_id?: string;
    input_tokens?: string;
    output_tokens?: string;
    total_tokens?: string;
    llm_calls?: string;
  };
}

const MODEL_PRICING: Record<string, { input: number; output: number; label: string }> = {
  // Anthropic
  'claude-opus-4-7': { input: 15, output: 75, label: 'Opus 4.7' },
  'claude-opus-4-6': { input: 15, output: 75, label: 'Opus 4.6' },
  'claude-opus-4-0': { input: 15, output: 75, label: 'Opus 4' },
  'claude-sonnet-4-5': { input: 3, output: 15, label: 'Sonnet 4.5' },
  'claude-sonnet-4-0': { input: 3, output: 15, label: 'Sonnet 4' },
  'claude-sonnet-4': { input: 3, output: 15, label: 'Sonnet 4' },
  'claude-3-5-sonnet': { input: 3, output: 15, label: 'Sonnet 3.5' },
  'claude-3-5-haiku': { input: 0.8, output: 4, label: 'Haiku 3.5' },
  'claude-3-haiku': { input: 0.25, output: 1.25, label: 'Haiku 3' },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10, label: 'GPT-4o' },
  'gpt-4o-mini': { input: 0.15, output: 0.6, label: 'GPT-4o Mini' },
  'gpt-4-turbo': { input: 10, output: 30, label: 'GPT-4 Turbo' },
  'gpt-4': { input: 30, output: 60, label: 'GPT-4' },
  // Google
  'gemini-2.5-pro': { input: 1.25, output: 10, label: 'Gemini 2.5 Pro' },
  'gemini-2.5-flash': { input: 0.15, output: 0.6, label: 'Gemini 2.5 Flash' },
  'gemini-2.0-flash': { input: 0.1, output: 0.4, label: 'Gemini 2.0 Flash' },
};

// Maps connector ID fragments to model keys for agent steps where model isn't in output
const CONNECTOR_MODEL_MAP: Record<string, string> = {
  'opus': 'claude-opus-4-6',
  'sonnet': 'claude-sonnet-4',
  'haiku': 'claude-3-5-haiku',
  'gpt-4o': 'gpt-4o',
  'gpt-4': 'gpt-4',
  'gemini': 'gemini-2.5-pro',
};

const DEFAULT_PRICING = { input: 15, output: 75, label: 'Unknown' };

// Known step names that use the default Elastic AI Agent (Opus 4.6)
const AI_AGENT_STEPS = new Set(['summarize_enrichment', 'hunt_in_environment', 'hunt_in_environment_after_approval']);

function resolveModel(modelField?: string, stepName?: string, connectorId?: string): string {
  if (modelField) return modelField;
  // Try connector ID (e.g. ".anthropic-claude-4.6-opus-chat_completion" -> opus -> claude-opus-4-6)
  if (connectorId) {
    const cid = connectorId.toLowerCase();
    for (const [fragment, model] of Object.entries(CONNECTOR_MODEL_MAP)) {
      if (cid.includes(fragment)) return model;
    }
  }
  // Fallback: known AI agent steps default to Opus 4.6 (Elastic AI Agent)
  if (stepName && AI_AGENT_STEPS.has(stepName)) return 'claude-opus-4-6';
  // Try step name fragments
  if (stepName) {
    for (const [fragment, model] of Object.entries(CONNECTOR_MODEL_MAP)) {
      if (stepName.toLowerCase().includes(fragment)) return model;
    }
  }
  return '';
}

function parseNum(v?: string): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

export default function CostDisplay({ costData }: { costData: Record<string, unknown> }) {
  const tracking = costData as unknown as CostTrackingData;

  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  const steps: { name: string; model: string; inputTokens: number; outputTokens: number; cost: number; calls?: number }[] = [];

  for (const [stepName, data] of Object.entries(tracking)) {
    if (!data || typeof data !== 'object') continue;

    const inputTokens = parseNum(data.input_tokens);
    const outputTokens = parseNum(data.output_tokens);
    if (inputTokens === 0 && outputTokens === 0) continue;

    const modelKey = resolveModel(data.model, stepName, data.connector_id);
    const pricing = MODEL_PRICING[modelKey]
      ?? Object.entries(MODEL_PRICING).find(([k]) => modelKey.startsWith(k))?.[1]
      ?? DEFAULT_PRICING;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const stepCost = inputCost + outputCost;

    totalInput += inputTokens;
    totalOutput += outputTokens;
    totalCost += stepCost;

    steps.push({
      name: stepName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      model: pricing.label || modelKey,
      inputTokens,
      outputTokens,
      cost: stepCost,
      calls: parseNum(data.llm_calls) || undefined,
    });
  }

  if (steps.length === 0) return null;

  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        listStyle: 'none',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="var(--text-faint)" strokeWidth="1" />
          <text x="7" y="10" textAnchor="middle" fill="var(--text-faint)" fontSize="8" fontFamily="var(--font-mono)">$</text>
        </svg>
        <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
          ${totalCost.toFixed(2)}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>
          est. cost
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          ({((totalInput + totalOutput) / 1000).toFixed(1)}K tokens)
        </span>
      </summary>

      <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 3, background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{step.name}</span>
                  <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '1px 6px', borderRadius: 2, color: 'var(--blue)', background: 'rgba(27,169,245,0.08)', border: '1px solid rgba(27,169,245,0.2)' }}>
                    {step.model}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', display: 'flex', gap: 12 }}>
                  <span>{step.inputTokens.toLocaleString()} in</span>
                  <span>{step.outputTokens.toLocaleString()} out</span>
                  {step.calls && <span>{step.calls} call{step.calls > 1 ? 's' : ''}</span>}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                ${step.cost.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-strong)' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Total</span>
          <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', fontVariantNumeric: 'tabular-nums' }}>
            ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>
    </details>
  );
}
