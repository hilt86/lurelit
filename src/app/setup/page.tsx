'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LurelitMascot, { type MascotState } from '@/components/LurelitMascot';

type Step = 1 | 2 | 3 | 4 | 5;

interface CheckResult {
  connected: boolean;
  version: string | null;
  workflows: boolean;
  agentBuilder: boolean;
  security: boolean;
  errors: string[];
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

interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  connectorIds?: Record<string, string>;
}

interface InferenceConnector {
  id: string;
  name: string;
  connectorTypeId: string;
}

interface ConnectorGroup {
  label: string;
  keyLabel: string;
  keyPlaceholder: string;
  connectorIds: string[];
  required: boolean;
}

const CONNECTOR_GROUPS: ConnectorGroup[] = [
  {
    label: 'Anthropic API',
    keyLabel: 'Anthropic API Key',
    keyPlaceholder: 'sk-ant-...',
    connectorIds: ['anthropic-api'],
    required: true,
  },
  {
    label: 'VirusTotal',
    keyLabel: 'VirusTotal API Key',
    keyPlaceholder: 'Your VirusTotal API key',
    connectorIds: ['vt-url', 'vt-base', 'vt-files'],
    required: true,
  },
  {
    label: 'VirusTotal (Native)',
    keyLabel: 'VirusTotal API Key',
    keyPlaceholder: 'Your VirusTotal API key',
    connectorIds: ['virustotal-native'],
    required: true,
  },
  {
    label: 'urlscan.io',
    keyLabel: 'urlscan.io API Key',
    keyPlaceholder: 'Your urlscan.io API key',
    connectorIds: ['url-scan-search'],
    required: true,
  },
  {
    label: 'Slack',
    keyLabel: 'Slack Bot Token',
    keyPlaceholder: 'xoxb-...',
    connectorIds: ['slack-post-message'],
    required: false,
  },
];

const STEP_TITLES: Record<Step, string> = {
  1: 'Connect to Kibana',
  2: 'Check Prerequisites',
  3: 'Connectors',
  4: 'Import Workflow',
  5: 'Ready!',
};

const STEP_MASCOT: Record<Step, MascotState> = {
  1: 'watching',
  2: 'analyzing',
  3: 'analyzing',
  4: 'watching',
  5: 'clean',
};

function LurelitWordmark() {
  return (
    <span className="mono" style={{ fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <span style={{ color: 'var(--teal-bright)' }} className="glow-text-teal">LURE</span>
      <span style={{ color: 'var(--text-dim)' }}>LIT</span>
    </span>
  );
}

function ProgressBar({ current }: { current: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, padding: '0 8px', justifyContent: 'center' }}>
      {([1, 2, 3, 4, 5] as Step[]).map(s => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: s < 5 ? 1 : 'none' }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
            border: '1.5px solid',
            borderColor: s <= current ? 'var(--teal)' : 'var(--border-strong)',
            background: s < current ? 'var(--teal)' : s === current ? 'var(--teal-soft)' : 'transparent',
            color: s < current ? 'var(--bg-deep)' : s === current ? 'var(--teal-bright)' : 'var(--text-faint)',
            transition: 'all 0.3s ease',
            flexShrink: 0,
          }}>
            {s < current ? '✓' : s}
          </div>
          {s < 5 && (
            <div style={{
              flex: 1, height: 2,
              background: s < current ? 'var(--teal)' : 'var(--border-strong)',
              transition: 'background 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function CheckIcon({ pass }: { pass: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: '50%',
      background: pass ? 'var(--teal-soft)' : 'var(--pink-soft)',
      border: `1px solid ${pass ? 'rgba(0,191,179,0.4)' : 'rgba(240,78,152,0.4)'}`,
      fontSize: 12, fontWeight: 700,
      color: pass ? 'var(--teal-bright)' : 'var(--pink-bright)',
    }}>
      {pass ? '✓' : '✗'}
    </span>
  );
}

function Spinner() {
  return (
    <div className="animate-spin-slow" style={{
      width: 16, height: 16,
      border: '2px solid var(--border-strong)',
      borderTopColor: 'var(--teal)',
      borderRadius: '50%',
    }} />
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightYamlLine(line: string): string {
  // Simple approach: apply highlighting without escaping issues
  if (/^\s*#/.test(line)) {
    return '<span style="color:var(--text-faint);font-style:italic">' + line.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
  }

  // Split the line into segments and colorize
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Match key: pattern
  const keyMatch = line.match(/^(\s*)([\w][\w.-]*)(:)(.*)/);
  if (keyMatch) {
    const [, indent, key, colon, rest] = keyMatch;
    let html = safe(indent);
    html += '<span style="color:var(--teal-bright)">' + safe(key) + '</span>';
    html += '<span style="color:var(--text-faint)">' + safe(colon) + '</span>';
    html += colorizeValue(rest);
    return html;
  }

  return colorizeValue(line);
}

function colorizeValue(str: string): string {
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let result = '';
  let i = 0;
  while (i < str.length) {
    // String in double quotes
    if (str[i] === '"') {
      const end = str.indexOf('"', i + 1);
      if (end > i) {
        const s = str.substring(i, end + 1);
        result += '<span style="color:var(--pink)">' + safe(s) + '</span>';
        i = end + 1;
        continue;
      }
    }
    // String in single quotes
    if (str[i] === "'") {
      const end = str.indexOf("'", i + 1);
      if (end > i) {
        const s = str.substring(i, end + 1);
        result += '<span style="color:var(--pink)">' + safe(s) + '</span>';
        i = end + 1;
        continue;
      }
    }
    // Comment
    if (str[i] === '#') {
      result += '<span style="color:var(--text-faint);font-style:italic">' + safe(str.substring(i)) + '</span>';
      break;
    }
    // Word - check for booleans/numbers
    if (/[a-z0-9]/i.test(str[i])) {
      const wordMatch = str.substring(i).match(/^(\w+)/);
      if (wordMatch) {
        const word = wordMatch[1];
        if (/^(true|false|null)$/.test(word)) {
          result += '<span style="color:#e5c07b">' + word + '</span>';
        } else if (/^\d+$/.test(word)) {
          result += '<span style="color:#e5c07b">' + word + '</span>';
        } else {
          result += safe(word);
        }
        i += word.length;
        continue;
      }
    }
    result += safe(str[i]);
    i++;
  }
  return result;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [kibanaUrl, setKibanaUrl] = useState('');
  const [authMode, setAuthMode] = useState<'basic' | 'api_key'>('basic');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [workflowId, setWorkflowId] = useState('');
  const [workflowValid, setWorkflowValid] = useState(false);
  const [workflowName, setWorkflowName] = useState<string | null>(null);

  const [connectorStatuses, setConnectorStatuses] = useState<ConnectorStatus[]>([]);
  const [connectorChecked, setConnectorChecked] = useState(false);
  const [connectorChecking, setConnectorChecking] = useState(false);
  const [connectorKeys, setConnectorKeys] = useState<Record<string, string>>({});
  const [creatingConnector, setCreatingConnector] = useState<string | null>(null);
  const [connectorErrors, setConnectorErrors] = useState<Record<string, string>>({});
  const [expandedConnectors, setExpandedConnectors] = useState<Record<string, boolean>>({});

  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [workflowsLoaded, setWorkflowsLoaded] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  const [inferenceConnectors, setInferenceConnectors] = useState<InferenceConnector[]>([]);
  const [inferenceAvailable, setInferenceAvailable] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [showAdvancedWorkflow, setShowAdvancedWorkflow] = useState(false);

  const [opusConnectorOverride, setOpusConnectorOverride] = useState<string>('');
  const [sonnetConnectorOverride, setSonnetConnectorOverride] = useState<string>('');
  const [yamlPreview, setYamlPreview] = useState<string>('');
  const [yamlExpanded, setYamlExpanded] = useState(false);
  const [yamlLoading, setYamlLoading] = useState(false);
  const [yamlCopied, setYamlCopied] = useState(false);
  const [yamlFullscreen, setYamlFullscreen] = useState(false);
  const [yamlFullscreenCopied, setYamlFullscreenCopied] = useState(false);

  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminKey, setAdminKey] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/setup/auth')
      .then(r => r.json())
      .then(data => { setAuthenticated(data.authenticated); setAuthChecking(false); })
      .catch(() => setAuthChecking(false));
  }, []);

  const handleAuth = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await fetch('/api/setup/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await res.json();
      if (data.valid) {
        setAuthenticated(true);
      } else {
        setAuthError(data.error || 'Invalid key');
      }
    } catch {
      setAuthError('Request failed');
    }
  }, [adminKey]);

  const authPayload = useCallback(() => ({
    kibanaUrl,
    authMode,
    username,
    password,
    apiKey,
  }), [kibanaUrl, authMode, username, password, apiKey]);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload()),
      });
      const data: CheckResult = await res.json();
      setCheckResult(data);
      if (data.connected) {
        setStep(2);
      } else {
        setError(data.errors?.[0] || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [authPayload]);

  const handleSave = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kibanaUrl: kibanaUrl.replace(/\/+$/, ''), workflowId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/login');
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }, [kibanaUrl, workflowId, router]);

  const checkConnectors = useCallback(async () => {
    setConnectorChecking(true);
    setConnectorErrors({});
    try {
      const res = await fetch('/api/setup/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authPayload(), action: 'check' }),
      });
      const data = await res.json();
      if (data.connectors) {
        setConnectorStatuses(data.connectors);
        setConnectorChecked(true);
      }
      if (data.inferenceConnectors) {
        setInferenceConnectors(data.inferenceConnectors);
      }
      if (data.inferenceAvailable !== undefined) {
        setInferenceAvailable(data.inferenceAvailable);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check connectors');
    } finally {
      setConnectorChecking(false);
    }
  }, [authPayload]);

  const createConnector = useCallback(async (connectorId: string, apiKey: string) => {
    setCreatingConnector(connectorId);
    setConnectorErrors(prev => ({ ...prev, [connectorId]: '' }));
    try {
      const res = await fetch('/api/setup/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authPayload(),
          action: 'create',
          connectorType: connectorId,
          credentials: { apiKey },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectorStatuses(prev =>
          prev.map(s => s.id === connectorId ? { ...s, found: true, connectorId: data.connectorId } : s)
        );
      } else {
        setConnectorErrors(prev => ({ ...prev, [connectorId]: data.error || 'Creation failed' }));
      }
    } catch (err) {
      setConnectorErrors(prev => ({ ...prev, [connectorId]: err instanceof Error ? err.message : 'Request failed' }));
    } finally {
      setCreatingConnector(null);
    }
  }, [authPayload]);

  const createAllMissing = useCallback(async () => {
    for (const group of CONNECTOR_GROUPS) {
      const key = connectorKeys[group.label] || '';
      if (!key) continue;
      for (const cId of group.connectorIds) {
        const status = connectorStatuses.find(s => s.id === cId);
        if (status && !status.found) {
          await createConnector(cId, key);
        }
      }
    }
  }, [connectorKeys, connectorStatuses, createConnector]);

  const loadWorkflows = useCallback(async () => {
    setWorkflowsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authPayload(), action: 'list' }),
      });
      const data = await res.json();
      if (data.workflows) {
        setWorkflows(data.workflows);
        setWorkflowsLoaded(true);
        const lurelit = data.workflows.find((w: WorkflowInfo) =>
          w.name.toLowerCase().includes('phishing') || w.name.toLowerCase().includes('smishing') || w.name.toLowerCase().includes('lurelit')
        );
        if (lurelit) {
          setSelectedWorkflow(lurelit.id);
          setShowImportSection(false);
        } else {
          setShowImportSection(true);
        }
      } else {
        setError(data.error || 'Failed to list workflows');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list workflows');
    } finally {
      setWorkflowsLoading(false);
    }
  }, [authPayload]);

  const handleCreateWorkflow = useCallback(async () => {
    setCreatingWorkflow(true);
    setError(null);
    try {
      const connectorIdMap: Record<string, string> = {};
      for (const s of connectorStatuses) {
        if (s.found && s.connectorId) {
          connectorIdMap[s.id] = s.connectorId;
        }
      }
      if (opusConnectorOverride) {
        connectorIdMap['.anthropic-claude-4.6-opus-chat_completion'] = opusConnectorOverride;
      }
      if (sonnetConnectorOverride) {
        connectorIdMap['.anthropic-claude-4.6-sonnet-chat_completion'] = sonnetConnectorOverride;
      }
      const res = await fetch('/api/setup/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authPayload(),
          action: 'create',
          connectorIds: connectorIdMap,
        }),
      });
      const data = await res.json();
      if (data.success && data.workflow) {
        setWorkflows(prev => [...prev, data.workflow]);
        setSelectedWorkflow(data.workflow.id);
        setWorkflowId(data.workflow.id);
        setWorkflowValid(true);
        setWorkflowName(data.workflow.name);
        setStep(5);
      } else {
        setError(data.error || 'Failed to create workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setCreatingWorkflow(false);
    }
  }, [authPayload, connectorStatuses, opusConnectorOverride, sonnetConnectorOverride]);

  const handleSelectWorkflow = useCallback(async () => {
    if (!selectedWorkflow) return;
    setWorkflowId(selectedWorkflow);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/validate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authPayload(), workflowId: selectedWorkflow }),
      });
      const data = await res.json();
      if (data.valid) {
        setWorkflowValid(true);
        setWorkflowName(data.name);
        setStep(5);
      } else {
        setError(data.error || 'Workflow validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflow, authPayload]);

  const loadYamlPreview = useCallback(async () => {
    setYamlLoading(true);
    try {
      const params = new URLSearchParams();
      if (opusConnectorOverride) {
        params.set('opusConnectorId', opusConnectorOverride);
      }
      if (sonnetConnectorOverride) {
        params.set('sonnetConnectorId', sonnetConnectorOverride);
      }
      const qs = params.toString();
      const res = await fetch(`/api/setup/workflows${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (data.yaml) {
        setYamlPreview(data.yaml);
      }
    } catch {
      setYamlPreview('# Failed to load workflow YAML');
    } finally {
      setYamlLoading(false);
    }
  }, [opusConnectorOverride, sonnetConnectorOverride]);

  useEffect(() => {
    if (step === 3 && !connectorChecked && !connectorChecking) {
      checkConnectors();
    }
  }, [step, connectorChecked, connectorChecking, checkConnectors]);

  useEffect(() => {
    if (inferenceConnectors.length > 0) {
      if (!opusConnectorOverride || !inferenceConnectors.find(ic => ic.id === opusConnectorOverride)) {
        setOpusConnectorOverride(inferenceConnectors[0].id);
      }
      if (!sonnetConnectorOverride || !inferenceConnectors.find(ic => ic.id === sonnetConnectorOverride)) {
        const second = inferenceConnectors.length > 1 ? inferenceConnectors[1].id : inferenceConnectors[0].id;
        setSonnetConnectorOverride(second);
      }
    }
  }, [inferenceConnectors, opusConnectorOverride, sonnetConnectorOverride]);

  useEffect(() => {
    if (step === 4 && !workflowsLoaded && !workflowsLoading) {
      loadWorkflows();
    }
  }, [step, workflowsLoaded, workflowsLoading, loadWorkflows]);

  useEffect(() => {
    if (yamlExpanded && step === 4) {
      loadYamlPreview();
    }
  }, [yamlExpanded, step, loadYamlPreview]);

  useEffect(() => {
    if (!yamlFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setYamlFullscreen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [yamlFullscreen]);

  const allRequiredFound = CONNECTOR_GROUPS
    .filter(g => g.required)
    .every(g => g.connectorIds.every(cId => connectorStatuses.find(s => s.id === cId)?.found))
    && inferenceAvailable;

  const hasMissing = connectorStatuses.some(s => !s.found);

  const canCreateAll = CONNECTOR_GROUPS
    .filter(g => g.required && g.keyLabel)
    .every(g => {
      const allFound = g.connectorIds.every(cId => connectorStatuses.find(s => s.id === cId)?.found);
      return allFound || (connectorKeys[g.label] || '').trim().length > 0;
    });

  const canContinueFromPrereqs = checkResult?.connected &&
    checkResult.workflows;

  const hasCustomConnectors = inferenceConnectors.length > 0 && (
    (opusConnectorOverride && opusConnectorOverride !== inferenceConnectors[0]?.id) ||
    (sonnetConnectorOverride && sonnetConnectorOverride !== (inferenceConnectors.length > 1 ? inferenceConnectors[1]?.id : inferenceConnectors[0]?.id))
  );

  const versionOk = checkResult?.version
    ? parseFloat(checkResult.version) >= 9.0
    : false;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 24px 80px' }}>
      <div className="animate-slide-up" style={{ width: '100%', maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <LurelitMascot size={90} state={STEP_MASCOT[step]} />
          <div style={{ marginTop: 14 }}>
            <LurelitWordmark />
          </div>
          <p className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 8 }}>
            First-run setup
          </p>
        </div>

        {/* Auth gate */}
        {authChecking ? (
          <div className="card" style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Spinner />
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>Checking auth…</span>
          </div>
        ) : !authenticated ? (
          <div className="card" style={{ padding: 32 }}>
            <p className="label" style={{ color: 'var(--teal-bright)', marginBottom: 6 }}>
              // Admin Authentication
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 8, marginBottom: 16 }}>
              Enter the admin key to proceed. This was displayed in the server terminal on first launch.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input"
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && adminKey.trim()) handleAuth(); }}
                placeholder="Paste admin key…"
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAuth}
                disabled={!adminKey.trim()}
              >
                Unlock
              </button>
            </div>
            {authError && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 3, border: '1px solid rgba(240,78,152,0.3)', background: 'rgba(240,78,152,0.06)' }}>
                <p className="mono" style={{ fontSize: 11, color: 'var(--pink)' }}>{authError}</p>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Progress */}
        <ProgressBar current={step} />

        {/* Step card */}
        <div className="card" style={{ padding: 32 }}>
          <p className="label" style={{ color: 'var(--teal-bright)', marginBottom: 6 }}>
            // Step {step}: {STEP_TITLES[step]}
          </p>

          {/* Step 1: Connect */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div>
                <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 6 }}>Kibana URL</label>
                <input
                  className="input"
                  type="url"
                  value={kibanaUrl}
                  onChange={e => setKibanaUrl(e.target.value)}
                  placeholder="https://your-kibana.elastic.co"
                  autoFocus
                />
                <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.5 }}>
                  Running in Docker? Use <span className="mono" style={{ color: 'var(--teal)', cursor: 'pointer' }} onClick={() => setKibanaUrl('http://host.docker.internal:5601')}>host.docker.internal:5601</span> for local Kibana.
                </p>
              </div>
              <div>
                <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 8 }}>Authentication method</label>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  {[
                    { key: 'basic', label: 'Username / Password' },
                    { key: 'api_key', label: 'API Key (Serverless)' },
                  ].map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setAuthMode(option.key as 'basic' | 'api_key')}
                      className="mono"
                      style={{
                        padding: '8px 12px',
                        borderRadius: 3,
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        border: `1px solid ${authMode === option.key ? 'var(--teal)' : 'var(--border-strong)'}`,
                        background: authMode === option.key ? 'rgba(0,191,179,0.10)' : 'transparent',
                        color: authMode === option.key ? 'var(--teal-bright)' : 'var(--text-dim)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {authMode === 'basic' ? (
                <>
                  <div>
                    <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 6 }}>Username</label>
                    <input
                      className="input"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="elastic"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 6 }}>Password</label>
                    <input
                      className="input"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 6 }}>Elastic API Key</label>
                  <textarea
                    className="input"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Paste an encoded Elastic API key"
                    rows={3}
                    style={{ resize: 'vertical', minHeight: 96 }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.5 }}>
                    Recommended for Elastic Serverless. The key must be able to call Kibana Workflows, Agent Builder, and Actions APIs.
                  </p>
                </div>
              )}

              {error && (
                <div style={{ padding: 12, borderRadius: 3, border: '1px solid rgba(240,78,152,0.3)', background: 'rgba(240,78,152,0.06)' }}>
                  <p className="mono" style={{ fontSize: 12, color: 'var(--pink)' }}>{error}</p>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={loading || !kibanaUrl || (authMode === 'api_key' ? !apiKey : !username || !password)}
                style={{ marginTop: 8, justifyContent: 'center', width: '100%' }}
              >
                {loading ? <><Spinner /> Connecting…</> : 'Connect →'}
              </button>
            </div>
          )}

          {/* Step 2: Prerequisites */}
          {step === 2 && checkResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row gap-3">
                  <CheckIcon pass={checkResult.connected} />
                  <span className="mono" style={{ fontSize: 13 }}>Kibana connection</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>OK</span>
                </div>
                <div className="row gap-3">
                  <CheckIcon pass={versionOk} />
                  <span className="mono" style={{ fontSize: 13 }}>Kibana version (9.0+)</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>
                    {checkResult.version || 'Unknown'}
                  </span>
                </div>
                <div className="row gap-3">
                  <CheckIcon pass={checkResult.workflows} />
                  <span className="mono" style={{ fontSize: 13 }}>Workflows API</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>
                    {checkResult.workflows ? 'Available' : 'Not found'}
                  </span>
                </div>
                <div className="row gap-3">
                  <CheckIcon pass={checkResult.agentBuilder} />
                  <span className="mono" style={{ fontSize: 13 }}>Agent Builder</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>
                    {checkResult.agentBuilder ? 'Available' : 'Not found'}
                  </span>
                </div>
                <div className="row gap-3">
                  <CheckIcon pass={checkResult.security} />
                  <span className="mono" style={{ fontSize: 13 }}>Security solution</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>
                    {checkResult.security ? 'Enabled' : 'Not enabled'}
                  </span>
                </div>
              </div>

              {checkResult.errors.length > 0 && (
                <div style={{ padding: 12, borderRadius: 3, border: '1px solid rgba(240,78,152,0.3)', background: 'rgba(240,78,152,0.06)' }}>
                  {checkResult.errors.map((e, i) => (
                    <p key={i} className="mono" style={{ fontSize: 11, color: 'var(--pink)', marginBottom: i < checkResult.errors.length - 1 ? 4 : 0 }}>{e}</p>
                  ))}
                </div>
              )}

              <div className="row gap-3" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button
                  className="btn btn-primary"
                  disabled={!canContinueFromPrereqs}
                  onClick={() => setStep(3)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connectors */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                The workflow uses connectors to call external APIs and inference endpoints.
                Check which ones already exist or create missing HTTP ones below.
              </p>

              {connectorChecking && !connectorChecked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
                  <Spinner />
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>Checking connectors…</span>
                </div>
              )}

              {connectorChecked && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {CONNECTOR_GROUPS.map(group => {
                    const groupStatuses = group.connectorIds.map(
                      cId => connectorStatuses.find(s => s.id === cId)
                    );
                    const allFound = groupStatuses.every(s => s?.found);
                    const anyMissing = groupStatuses.some(s => s && !s.found);

                    return (
                      <div key={group.label} className="card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: anyMissing ? 12 : 0 }}>
                          <div style={{
                            width: 9, height: 9, borderRadius: '50%',
                            background: allFound ? 'var(--teal)' : 'var(--pink)',
                            boxShadow: allFound ? '0 0 8px var(--teal)' : '0 0 8px var(--pink)',
                          }} />
                          <span className="mono" style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                            {group.label}
                            {!group.required && <span style={{ color: 'var(--text-faint)', marginLeft: 8, fontSize: 10 }}>optional</span>}
                          </span>
                          <span className="mono" style={{ fontSize: 11, color: allFound ? 'var(--teal-bright)' : 'var(--pink)' }}>
                            {allFound ? '✓ Found' : `${groupStatuses.filter(s => s && !s.found).length} missing`}
                          </span>
                        </div>

                        {allFound && group.connectorIds.length > 1 && (
                          <div style={{ marginTop: 8, paddingLeft: 19 }}>
                            {groupStatuses.map(s => s && (
                              <div key={s.id} className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>
                                {s.name} <span style={{ color: 'var(--teal)', opacity: 0.7 }}>✓</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {allFound && (
                          <div style={{ marginTop: 8, paddingLeft: 19 }}>
                            <button
                              onClick={() => setExpandedConnectors(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 11, color: 'var(--text-faint)', padding: '2px 0',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              <span style={{ fontSize: 13 }}>ℹ</span>
                              <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
                                {expandedConnectors[group.label] ? 'Hide details' : 'View config'}
                              </span>
                            </button>
                            {expandedConnectors[group.label] && (
                              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 3, background: 'var(--bg-deep)', border: '1px solid var(--border)' }}>
                                {groupStatuses.map(s => s && (
                                  <div key={s.id} style={{ marginBottom: groupStatuses.indexOf(s) < groupStatuses.length - 1 ? 10 : 0 }}>
                                    <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 2, fontWeight: 500 }}>{s.name}</div>
                                    <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                      ID: <span style={{ color: 'var(--teal-bright)' }}>{s.connectorId || s.id}</span>
                                    </div>
                                    <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                      Type: <span style={{ color: 'var(--text-dim)' }}>{s.connectorType || 'unknown'}</span>
                                    </div>
                                    {s.url && (
                                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                                        URL: <span style={{ color: 'var(--text-dim)', wordBreak: 'break-all' }}>{s.url}</span>
                                      </div>
                                    )}
                                    {s.headers && Object.keys(s.headers).length > 0 && (
                                      <div style={{ marginTop: 4 }}>
                                        <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 2 }}>Headers:</div>
                                        {Object.entries(s.headers).map(([hk, hv]) => (
                                          <div key={hk} className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', paddingLeft: 8 }}>
                                            {hk}: <span style={{ color: 'var(--text-faint)' }}>{hv}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {anyMissing && (
                          <div style={{ paddingLeft: 19 }}>
                            {group.connectorIds.length > 1 && (
                              <div style={{ marginBottom: 10 }}>
                                {groupStatuses.map(s => s && (
                                  <div key={s.id} className="mono" style={{ fontSize: 11, color: s.found ? 'var(--text-faint)' : 'var(--pink)', marginBottom: 2 }}>
                                    {s.name} {s.found ? <span style={{ color: 'var(--teal)', opacity: 0.7 }}>✓</span> : <span>✗</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {group.keyLabel ? (
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                  <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 4, fontSize: 10 }}>
                                    {group.keyLabel}
                                  </label>
                                  <input
                                    className="input"
                                    type="password"
                                    value={connectorKeys[group.label] || ''}
                                    onChange={e => setConnectorKeys(prev => ({ ...prev, [group.label]: e.target.value }))}
                                    placeholder={group.keyPlaceholder}
                                    style={{ fontSize: 12 }}
                                  />
                                </div>
                                <button
                                  className="btn btn-primary"
                                  disabled={!(connectorKeys[group.label] || '').trim() || creatingConnector !== null}
                                  onClick={async () => {
                                    const key = connectorKeys[group.label] || '';
                                    for (const cId of group.connectorIds) {
                                      const s = connectorStatuses.find(st => st.id === cId);
                                      if (s && !s.found) {
                                        await createConnector(cId, key);
                                      }
                                    }
                                  }}
                                  style={{ fontSize: 11, padding: '8px 12px', whiteSpace: 'nowrap' }}
                                >
                                  {creatingConnector && group.connectorIds.includes(creatingConnector)
                                    ? <><Spinner /> Creating…</>
                                    : 'Create'
                                  }
                                </button>
                              </div>
                            ) : (
                              <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>
                                This connector must be configured in Kibana directly.
                              </p>
                            )}
                            {group.connectorIds.map(cId => connectorErrors[cId] && (
                              <p key={cId} className="mono" style={{ fontSize: 11, color: 'var(--pink)', marginTop: 6 }}>
                                {connectorErrors[cId]}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {connectorChecked && hasMissing && canCreateAll && (
                <button
                  className="btn btn-primary"
                  onClick={createAllMissing}
                  disabled={creatingConnector !== null}
                  style={{ justifyContent: 'center' }}
                >
                  {creatingConnector ? <><Spinner /> Creating…</> : 'Create All Missing'}
                </button>
              )}

              {connectorChecked && inferenceConnectors.length > 0 && (
                <div className="card" style={{ padding: 16, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: 'var(--teal)',
                      boxShadow: '0 0 8px var(--teal)',
                    }} />
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                      Inference Endpoints
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--teal-bright)' }}>
                      ✓ Available ({inferenceConnectors.length})
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 14, paddingLeft: 19 }}>
                    Select which AI models to use for enrichment/hunting and report formatting from your available inference endpoints.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 19, marginBottom: 16 }}>
                    <div>
                      <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 6, fontSize: 10 }}>
                        AI Model for Enrichment &amp; Hunting
                      </label>
                      <select
                        className="input"
                        value={opusConnectorOverride}
                        onChange={e => setOpusConnectorOverride(e.target.value)}
                        style={{ fontSize: 12, width: '100%', cursor: 'pointer' }}
                      >
                        {inferenceConnectors.map(ic => (
                          <option key={ic.id} value={ic.id}>
                            {ic.name} ({ic.connectorTypeId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label-sm" style={{ display: 'block', color: 'var(--text-faint)', marginBottom: 6, fontSize: 10 }}>
                        AI Model for Report Formatting
                      </label>
                      <select
                        className="input"
                        value={sonnetConnectorOverride}
                        onChange={e => setSonnetConnectorOverride(e.target.value)}
                        style={{ fontSize: 12, width: '100%', cursor: 'pointer' }}
                      >
                        {inferenceConnectors.map(ic => (
                          <option key={ic.id} value={ic.id}>
                            {ic.name} ({ic.connectorTypeId})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, paddingLeft: 19 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                        Available inference connectors ({inferenceConnectors.length})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                      {inferenceConnectors.map(ic => (
                        <div key={ic.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 8px', borderRadius: 3,
                          background: (ic.id === opusConnectorOverride || ic.id === sonnetConnectorOverride) ? 'var(--teal-soft)' : 'var(--bg-deep)',
                          border: `1px solid ${(ic.id === opusConnectorOverride || ic.id === sonnetConnectorOverride) ? 'rgba(0,191,179,0.3)' : 'var(--border)'}`,
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: (ic.id === opusConnectorOverride || ic.id === sonnetConnectorOverride) ? 'var(--teal)' : 'var(--text-faint)',
                            flexShrink: 0,
                          }} />
                          <span className="mono" style={{ fontSize: 10, flex: 1, color: (ic.id === opusConnectorOverride || ic.id === sonnetConnectorOverride) ? 'var(--teal-bright)' : 'var(--text-dim)' }}>
                            {ic.name}
                          </span>
                          <span className="mono" style={{ fontSize: 9, color: 'var(--text-faint)' }}>
                            {ic.connectorTypeId}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {connectorChecked && inferenceConnectors.length === 0 && (
                <div className="card" style={{ padding: 16, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: 'var(--pink)',
                      boxShadow: '0 0 8px var(--pink)',
                    }} />
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                      Inference Endpoints
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--pink)' }}>
                      ✗ Missing
                    </span>
                  </div>
                  <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5, marginTop: 10, paddingLeft: 19 }}>
                    No inference connectors found. Configure at least one AI inference endpoint
                    (.inference, .gen-ai, .bedrock, or .gemini) in Kibana before continuing.
                  </p>
                </div>
              )}

              <div className="row gap-3" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setConnectorChecked(false); checkConnectors(); }}
                  disabled={connectorChecking}
                  style={{ fontSize: 11 }}
                >
                  {connectorChecking ? <><Spinner /></> : 'Check Again'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep(4)}
                  disabled={!allRequiredFound}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Import Workflow */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Import the bundled Lurelit workflow or select an existing one from Kibana.
              </p>

              {workflowsLoading && !workflowsLoaded && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
                  <Spinner />
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>Loading workflows…</span>
                </div>
              )}

              {/* Auto-detected Lurelit workflow — single confirmation card */}
              {workflowsLoaded && selectedWorkflow && !showImportSection && (() => {
                const lurelitWf = workflows.find(w => w.id === selectedWorkflow);
                if (!lurelitWf) return null;

                const connectorDiffs: Array<{ step: string; current: string; selected: string }> = [];
                if (lurelitWf.connectorIds && inferenceConnectors.length > 0) {
                  const wfConnectors = lurelitWf.connectorIds;
                  const uniqueInferenceIds = [...new Set(
                    Object.values(wfConnectors).filter(id => id.startsWith('.'))
                  )];

                  for (const [stepName, currentId] of Object.entries(wfConnectors)) {
                    if (!currentId.startsWith('.')) continue;

                    // Determine which role this connector fills:
                    // If there are exactly 2 unique inference connectors in the workflow,
                    // the one used by more steps is "opus" (enrichment/hunting) and
                    // the one used by fewer is "sonnet" (report formatting).
                    // If there's only 1 unique inference connector, compare against both selections.
                    let expectedId: string;
                    if (uniqueInferenceIds.length >= 2) {
                      const counts = uniqueInferenceIds.map(id => ({
                        id,
                        count: Object.values(wfConnectors).filter(v => v === id).length,
                      }));
                      counts.sort((a, b) => b.count - a.count);
                      const opusRole = counts[0].id;
                      expectedId = currentId === opusRole ? opusConnectorOverride : sonnetConnectorOverride;
                    } else {
                      // Single inference connector used for all steps — compare against
                      // the opus override (primary) since that's the enrichment/hunting model
                      expectedId = opusConnectorOverride;
                    }

                    if (expectedId && expectedId !== currentId) {
                      const currentName = inferenceConnectors.find(ic => ic.id === currentId)?.name || currentId;
                      const selectedName = inferenceConnectors.find(ic => ic.id === expectedId)?.name || expectedId;
                      connectorDiffs.push({ step: stepName, current: currentName, selected: selectedName });
                    }
                  }
                }

                return (
                  <div>
                    <div style={{
                      padding: 16, borderRadius: 6,
                      border: '2px solid var(--teal)',
                      background: 'var(--teal-soft)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>✓</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--teal-bright)', flex: 1 }}>
                          This workflow already exists in your Kibana instance
                        </span>
                      </div>
                      <div style={{ paddingLeft: 28, marginTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-bright)' }}>
                            {lurelitWf.name}
                          </span>
                          <span className="mono" style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 3,
                            background: lurelitWf.enabled ? 'rgba(0,191,179,0.12)' : 'rgba(240,78,152,0.08)',
                            color: lurelitWf.enabled ? 'var(--teal-bright)' : 'var(--pink)',
                            border: `1px solid ${lurelitWf.enabled ? 'rgba(0,191,179,0.3)' : 'rgba(240,78,152,0.25)'}`,
                          }}>
                            {lurelitWf.enabled ? 'enabled' : 'disabled'}
                          </span>
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{lurelitWf.id}</span>
                        {lurelitWf.description && (
                          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>
                            {lurelitWf.description}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                          This will be used for all Lurelit analyses.
                        </p>
                      </div>
                    </div>

                    {connectorDiffs.length > 0 ? (
                      <div style={{
                        marginTop: 10, padding: '10px 14px', borderRadius: 5,
                        border: '1px solid rgba(232,175,64,0.35)',
                        background: 'rgba(232,175,64,0.06)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 12 }}>⚠</span>
                          <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'rgb(232,175,64)' }}>
                            Connector differences detected
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 18 }}>
                          {connectorDiffs.map((d, i) => (
                            <div key={i} className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                              <span style={{ color: 'var(--text-faint)' }}>{d.step}:</span>{' '}
                              <span>{d.current}</span>
                              <span style={{ color: 'var(--text-faint)', margin: '0 4px' }}>→</span>
                              <span style={{ color: 'var(--teal-bright)' }}>{d.selected}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mono" style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 6, paddingLeft: 18, lineHeight: 1.4 }}>
                          Re-import the workflow to apply your connector changes.
                        </p>
                      </div>
                    ) : lurelitWf.connectorIds && inferenceConnectors.length > 0 ? (
                      <div style={{
                        marginTop: 10, padding: '6px 14px', borderRadius: 5,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--teal-bright)' }}>✓ Connectors match your Step 3 selections</span>
                      </div>
                    ) : null}

                    <button
                      onClick={() => setShowAdvancedWorkflow(!showAdvancedWorkflow)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '6px 0', marginTop: 4,
                        fontSize: 11, color: 'var(--text-faint)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: showAdvancedWorkflow ? 'rotate(90deg)' : 'none' }}>▸</span>
                      <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
                        {showAdvancedWorkflow ? 'Hide advanced options' : 'Advanced options'}
                      </span>
                    </button>
                  </div>
                );
              })()}

              {/* Import bundled workflow card — shown when no auto-detected or in advanced mode */}
              {workflowsLoaded && (showImportSection || showAdvancedWorkflow) && (
                <div style={{
                  padding: 18, borderRadius: 6,
                  border: '1.5px solid var(--border-strong)',
                  background: 'var(--bg-deep)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, var(--teal), var(--teal-bright))',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-bright)', flex: 1 }}>
                      Import bundled Lurelit workflow
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 8, marginBottom: 12, paddingLeft: 28 }}>
                    Import the pre-built Phishing &amp; Smishing Screenshot Analyzer workflow
                    using the connectors configured in the previous step.
                  </p>
                  <div style={{ marginBottom: 14, marginLeft: 28, padding: '8px 10px', borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <p className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>Connectors from Step 3:</p>
                    {connectorStatuses.filter(s => s.found).map(s => (
                      <div key={s.id} className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 1 }}>
                        {s.name} → <span style={{ color: 'var(--teal)' }}>{s.connectorId || s.id}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ paddingLeft: 28 }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleCreateWorkflow}
                      disabled={creatingWorkflow}
                      style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                    >
                      {creatingWorkflow
                        ? <><Spinner /> Importing workflow…</>
                        : showAdvancedWorkflow
                          ? 'Re-import with configured connectors →'
                          : 'Import Workflow →'
                      }
                    </button>
                    {showAdvancedWorkflow && (
                      <p className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 8, lineHeight: 1.5 }}>
                        This will update the workflow to use the AI models and connectors selected in Step 3.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Divider */}
              {workflowsLoaded && (showImportSection || showAdvancedWorkflow) && workflows.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.1em' }}>OR SELECT EXISTING</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              )}

              {/* YAML Preview */}
              {workflowsLoaded && (showImportSection || showAdvancedWorkflow) && (
                <>
                {hasCustomConnectors && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 4,
                    background: 'var(--teal-soft)',
                    border: '1px solid rgba(0,191,179,0.25)',
                  }}>
                    <span style={{ fontSize: 12 }}>ℹ</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--teal-bright)' }}>
                      Preview reflects your connector selections from Step 3
                    </span>
                  </div>
                )}
                <div style={{
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => {
                      const next = !yamlExpanded;
                      setYamlExpanded(next);
                      if (next && !yamlPreview) loadYamlPreview();
                    }}
                    style={{
                      width: '100%', padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-dim)',
                    }}
                  >
                    <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: yamlExpanded ? 'rotate(90deg)' : 'none' }}>▸</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>Preview workflow YAML</span>
                    {hasCustomConnectors ? (
                      <span className="mono" style={{ fontSize: 9, color: 'var(--teal-bright)', marginLeft: 'auto', padding: '2px 6px', borderRadius: 3, background: 'var(--teal-soft)', border: '1px solid rgba(0,191,179,0.3)' }}>
                        CONFIGURED WITH STEP 3 SELECTIONS
                      </span>
                    ) : opusConnectorOverride ? (
                      <span className="mono" style={{ fontSize: 9, color: 'var(--teal-bright)', marginLeft: 'auto', padding: '2px 6px', borderRadius: 3, background: 'var(--teal-soft)', border: '1px solid rgba(0,191,179,0.3)' }}>
                        CUSTOM AI MODELS
                      </span>
                    ) : null}
                  </button>
                  {yamlExpanded && (
                    <div style={{ position: 'relative' }}>
                      {yamlLoading ? (
                        <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <Spinner />
                          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>Loading YAML…</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setYamlFullscreen(true)}
                              className="mono"
                              title="Fullscreen"
                              style={{
                                fontSize: 10, padding: '4px 8px', borderRadius: 3,
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-strong)',
                                color: 'var(--text-faint)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              ↗
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(yamlPreview);
                                setYamlCopied(true);
                                setTimeout(() => setYamlCopied(false), 2000);
                              }}
                              className="mono"
                              style={{
                                fontSize: 10, padding: '4px 8px', borderRadius: 3,
                                background: yamlCopied ? 'var(--teal-soft)' : 'var(--bg-surface)',
                                border: `1px solid ${yamlCopied ? 'var(--teal)' : 'var(--border-strong)'}`,
                                color: yamlCopied ? 'var(--teal-bright)' : 'var(--text-faint)',
                                cursor: 'pointer',
                              }}
                            >
                              {yamlCopied ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                          <div style={{
                            maxHeight: 400, overflowY: 'auto', overflowX: 'auto',
                            background: 'var(--bg-deep)',
                            borderTop: '1px solid var(--border)',
                            padding: '12px 0',
                          }}>
                            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6 }}>
                              {yamlPreview.split('\n').map((line, i) => (
                                <div key={i} style={{ display: 'flex', minHeight: 18 }}>
                                  <span style={{ width: 44, textAlign: 'right', paddingRight: 12, color: 'var(--text-faint)', opacity: 0.5, userSelect: 'none', flexShrink: 0 }}>
                                    {i + 1}
                                  </span>
                                  <span style={{ flex: 1, whiteSpace: 'pre', paddingRight: 14 }}
                                    dangerouslySetInnerHTML={{ __html: highlightYamlLine(line) }}
                                  />
                                </div>
                              ))}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                </>
              )}

              {workflowsLoaded && (showImportSection || showAdvancedWorkflow) && workflows.length > 0 && (
                <>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    Select the Phishing &amp; Smishing Screenshot Analyzer workflow you previously imported.
                    This is the workflow Lurelit will use to run analyses.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {workflows.slice(0, 10).map(w => {
                      const isLurelit = w.name.toLowerCase().includes('phishing') || w.name.toLowerCase().includes('smishing') || w.name.toLowerCase().includes('lurelit');
                      return (
                        <div
                          key={w.id}
                          onClick={() => setSelectedWorkflow(w.id)}
                          style={{
                            padding: 14,
                            borderRadius: 4,
                            border: `1.5px solid ${selectedWorkflow === w.id ? 'var(--teal)' : 'var(--border)'}`,
                            background: selectedWorkflow === w.id ? 'var(--teal-soft)' : 'var(--bg-surface)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            opacity: isLurelit ? 1 : 0.55,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{
                              width: 14, height: 14, borderRadius: '50%',
                              border: `2px solid ${selectedWorkflow === w.id ? 'var(--teal)' : 'var(--border-strong)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {selectedWorkflow === w.id && (
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)' }} />
                              )}
                            </div>
                            <span className="mono" style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{w.name}</span>
                            {!isLurelit && (
                              <span className="mono" style={{ fontSize: 9, color: 'var(--text-faint)', padding: '2px 6px', borderRadius: 3, background: 'var(--bg-deep)', border: '1px solid var(--border)' }}>
                                not analysis workflow
                              </span>
                            )}
                            <span className="mono" style={{
                              fontSize: 10, padding: '2px 6px', borderRadius: 3,
                              background: w.enabled ? 'rgba(0,191,179,0.12)' : 'rgba(240,78,152,0.08)',
                              color: w.enabled ? 'var(--teal-bright)' : 'var(--pink)',
                              border: `1px solid ${w.enabled ? 'rgba(0,191,179,0.3)' : 'rgba(240,78,152,0.25)'}`,
                            }}>
                              {w.enabled ? 'enabled' : 'disabled'}
                            </span>
                          </div>
                          <div style={{ paddingLeft: 22 }}>
                            <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{w.id}</span>
                            {w.description && (
                              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {w.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {workflows.length > 10 && (
                      <p className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '4px 0' }}>
                        Showing 10 of {workflows.length} workflows
                      </p>
                    )}
                  </div>
                </>
              )}

              {workflowsLoaded && (showImportSection || showAdvancedWorkflow) && workflows.length === 0 && (
                <div style={{ padding: 16, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-surface)', textAlign: 'center' }}>
                  <p className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    No existing workflows found — use the import option above
                  </p>
                </div>
              )}

              {error && (
                <div style={{ padding: 12, borderRadius: 3, border: '1px solid rgba(240,78,152,0.3)', background: 'rgba(240,78,152,0.06)' }}>
                  <p className="mono" style={{ fontSize: 12, color: 'var(--pink)' }}>{error}</p>
                </div>
              )}

              <div className="row gap-3" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setWorkflowsLoaded(false); loadWorkflows(); }}
                  disabled={workflowsLoading}
                  style={{ fontSize: 11 }}
                >
                  {workflowsLoading ? <Spinner /> : 'Refresh'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSelectWorkflow}
                  disabled={loading || !selectedWorkflow || selectedWorkflow === '__bundled__'}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {loading ? <><Spinner /> Validating…</> : 'Use this workflow →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Ready */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 16, textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div className="badge badge-teal">Setup Complete</div>
                <p style={{ fontSize: 14, color: 'var(--text-dim)', maxWidth: 380 }}>
                  Lurelit is configured and ready to detect phishing lures. Your configuration will
                  be encrypted and saved locally.
                </p>
              </div>

              <div style={{ width: '100%', padding: 14, borderRadius: 3, background: 'var(--bg-surface)', border: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="row gap-3">
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', width: 90 }}>Kibana</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{kibanaUrl.replace(/\/+$/, '')}</span>
                  </div>
                  <div className="row gap-3">
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', width: 90 }}>Workflow</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{workflowName || workflowId}</span>
                  </div>
                  <div className="row gap-3">
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', width: 90 }}>Version</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{checkResult?.version || '—'}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ width: '100%', padding: 12, borderRadius: 3, border: '1px solid rgba(240,78,152,0.3)', background: 'rgba(240,78,152,0.06)' }}>
                  <p className="mono" style={{ fontSize: 12, color: 'var(--pink)' }}>{error}</p>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                {loading ? <><Spinner /> Saving…</> : 'Launch Lurelit →'}
              </button>
            </div>
          )}
        </div>

        <p className="mono" style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.16em', marginTop: 18 }}>
          Powered by Elastic Workflows and Agent Builder
        </p>
          </>
        )}
      </div>

      {/* Fullscreen YAML Modal */}
      {yamlFullscreen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(8, 12, 16, 0.95)',
            display: 'flex', flexDirection: 'column',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setYamlFullscreen(false); }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-bright)' }}>
              Workflow YAML Preview
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasCustomConnectors && (
                <span className="mono" style={{ fontSize: 9, color: 'var(--teal-bright)', padding: '2px 8px', borderRadius: 3, background: 'var(--teal-soft)', border: '1px solid rgba(0,191,179,0.3)' }}>
                  CONFIGURED WITH STEP 3 SELECTIONS
                </span>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yamlPreview);
                  setYamlFullscreenCopied(true);
                  setTimeout(() => setYamlFullscreenCopied(false), 2000);
                }}
                className="mono"
                style={{
                  fontSize: 11, padding: '6px 12px', borderRadius: 4,
                  background: yamlFullscreenCopied ? 'var(--teal-soft)' : 'var(--bg-deep)',
                  border: `1px solid ${yamlFullscreenCopied ? 'var(--teal)' : 'var(--border-strong)'}`,
                  color: yamlFullscreenCopied ? 'var(--teal-bright)' : 'var(--text-dim)',
                  cursor: 'pointer',
                }}
              >
                {yamlFullscreenCopied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setYamlFullscreen(false)}
                style={{
                  background: 'none', border: '1px solid var(--border-strong)',
                  borderRadius: 4, cursor: 'pointer',
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-dim)', fontSize: 16,
                }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 0', background: 'var(--bg-deep)' }}>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7 }}>
              {yamlPreview.split('\n').map((line, i) => (
                <div key={i} style={{ display: 'flex', minHeight: 20 }}>
                  <span style={{ width: 56, textAlign: 'right', paddingRight: 16, color: 'var(--text-faint)', opacity: 0.5, userSelect: 'none', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, whiteSpace: 'pre', paddingRight: 24 }}
                    dangerouslySetInnerHTML={{ __html: highlightYamlLine(line) }}
                  />
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}
