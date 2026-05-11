import type { WorkflowStatus, StepExecution } from './types';

const DEMO_STEPS: Omit<StepExecution, 'status' | 'startedAt' | 'completedAt' | 'output' | 'logs'>[] = [
  { id: 'step-1', stepId: 'analyze_screenshot', name: 'AI Screenshot Analysis' },
  { id: 'step-2', stepId: 'parse_analysis', name: 'Parse Analysis Results' },
  { id: 'step-3', stepId: 'enrich_iocs', name: 'IOC Enrichment (VirusTotal + urlscan.io)' },
  { id: 'step-4', stepId: 'summarize_enrichment', name: 'Enrichment Summary' },
  { id: 'step-5', stepId: 'hunt_in_environment', name: 'Environment Threat Hunt' },
  { id: 'step-6', stepId: 'format_report', name: 'Generate Final Report' },
];

const STEP_DURATIONS_MS = [3500, 800, 4500, 3000, 5000, 1200];

const DEMO_OUTPUTS: Record<string, Record<string, unknown>> = {
  'step-1': {
    data: {
      content: [{
        text: JSON.stringify({
          is_phishing: true,
          confidence_score: 92,
          type: 'smishing',
          summary: 'This SMS message impersonates a major bank and attempts to lure the recipient into clicking a malicious link by claiming their account has been compromised. The URL uses typosquatting (bankl0gin vs banklogin) and a suspicious TLD.',
          iocs: [
            { type: 'url', value: 'http://secure-bankl0gin.suspicious-domain.xyz/verify?id=8a3f2' },
            { type: 'domain', value: 'suspicious-domain.xyz' },
            { type: 'phone', value: '+1-555-0192' },
          ],
          red_flags: [
            'Urgent language pressuring immediate action',
            'Threat of account compromise',
            'URL with typosquatting (l0gin vs login)',
            'Newly registered suspicious domain',
            'Generic greeting instead of personal name',
            'No official branding or sender verification',
          ],
        }),
      }],
    },
  },

  'step-2': {
    is_phishing: true,
    confidence_score: 92,
    type: 'smishing',
    summary: 'This SMS message impersonates a major bank and attempts to lure the recipient into clicking a malicious link by claiming their account has been compromised. The URL uses typosquatting (bankl0gin vs banklogin) and a suspicious TLD.',
    iocs: [
      { type: 'url', value: 'http://secure-bankl0gin.suspicious-domain.xyz/verify?id=8a3f2' },
      { type: 'domain', value: 'suspicious-domain.xyz' },
      { type: 'phone', value: '+1-555-0192' },
    ],
    red_flags: [
      'Urgent language pressuring immediate action',
      'Threat of account compromise',
      'URL with typosquatting (l0gin vs login)',
      'Newly registered suspicious domain',
      'Generic greeting instead of personal name',
      'No official branding or sender verification',
    ],
  },

  'step-3': {
    iterations_completed: 3,
    results: [
      {
        ioc: { type: 'url', value: 'http://secure-bankl0gin.suspicious-domain.xyz/verify?id=8a3f2' },
        virustotal: { malicious: 14, suspicious: 3, harmless: 61, undetected: 7 },
        urlscan: { verdict: 'malicious', score: 100, categories: ['phishing'], screenshot_url: 'https://urlscan.io/screenshots/...' },
      },
      {
        ioc: { type: 'domain', value: 'suspicious-domain.xyz' },
        urlscan: { results_count: 3, first_seen: '2026-04-23', tags: ['phishing', 'banking'] },
      },
      {
        ioc: { type: 'phone', value: '+1-555-0192' },
        note: 'Phone number IOC — no enrichment connector available',
      },
    ],
  },

  'step-4': {
    structured_output: {
      has_malicious_iocs: true,
      malicious_indicators: [
        {
          type: 'url',
          value: 'http://secure-bankl0gin.suspicious-domain.xyz/verify?id=8a3f2',
          source: 'VirusTotal',
          details: '14/85 engines flagged as malicious. URL redirects to a credential harvesting page mimicking a bank login portal.',
        },
        {
          type: 'domain',
          value: 'suspicious-domain.xyz',
          source: 'urlscan.io',
          details: 'Domain registered 3 days ago via NameCheap. Associated with 3 known phishing campaigns targeting banking customers.',
        },
      ],
      summary: 'Both the URL and domain are confirmed malicious. The URL was flagged by 14 VirusTotal engines and urlscan.io classified it as a phishing page with a score of 100. The domain suspicious-domain.xyz was registered 3 days ago and is already associated with multiple phishing campaigns.',
    },
  },

  'step-5': {
    message: `## Environment Threat Hunt Results

### URL: secure-bankl0gin.suspicious-domain.xyz
- **DNS Logs (logs-dns*):** 2 hits found
  - Host: \`WORKSTATION-14\` resolved domain at 2026-04-26T14:32:11Z
  - Host: \`LAPTOP-MARKETING-03\` resolved domain at 2026-04-26T15:01:44Z
- **Proxy Logs (logs-proxy*):** 1 hit found
  - Host: \`WORKSTATION-14\` made HTTP GET request to the full URL at 2026-04-26T14:32:18Z (blocked by proxy)

### Domain: suspicious-domain.xyz
- **Network Flow (logs-network_traffic*):** 3 connections to IP 185.234.72.19 (resolved from domain)
  - All from \`WORKSTATION-14\` between 14:32-14:35 UTC on 2026-04-26

### Assessment
One host (\`WORKSTATION-14\`) attempted to visit the malicious URL but was blocked by the proxy. A second host resolved the domain in DNS but did not make a connection. Recommend isolating \`WORKSTATION-14\` for further investigation and notifying the user of \`LAPTOP-MARKETING-03\`.`,
  },

  'step-6': {
    title: 'Phishing/Smishing Analysis Report',
    classification_is_phishing: 'true',
    classification_type: 'smishing',
    classification_confidence: '92',
    classification_summary: 'This SMS message impersonates a major bank and attempts to lure the recipient into clicking a malicious link by claiming their account has been compromised. The URL uses typosquatting (bankl0gin vs banklogin) and a suspicious TLD.',
    classification_red_flags: JSON.stringify([
      'Urgent language pressuring immediate action',
      'Threat of account compromise',
      'URL with typosquatting (l0gin vs login)',
      'Newly registered suspicious domain',
      'Generic greeting instead of personal name',
      'No official branding or sender verification',
    ]),
    iocs_found: JSON.stringify([
      { type: 'url', value: 'http://secure-bankl0gin.suspicious-domain.xyz/verify?id=8a3f2' },
      { type: 'domain', value: 'suspicious-domain.xyz' },
      { type: 'phone', value: '+1-555-0192' },
    ]),
    enrichment_summary: 'Both the URL and domain are confirmed malicious. The URL was flagged by 14 VirusTotal engines and urlscan.io classified it as a phishing page with a score of 100. The domain suspicious-domain.xyz was registered 3 days ago and is already associated with multiple phishing campaigns.',
    malicious_indicators: JSON.stringify([
      {
        type: 'url',
        value: 'http://secure-bankl0gin.suspicious-domain.xyz/verify?id=8a3f2',
        source: 'VirusTotal',
        details: '14/85 engines flagged as malicious. URL redirects to a credential harvesting page mimicking a bank login portal.',
      },
      {
        type: 'domain',
        value: 'suspicious-domain.xyz',
        source: 'urlscan.io',
        details: 'Domain registered 3 days ago via NameCheap. Associated with 3 known phishing campaigns targeting banking customers.',
      },
    ]),
    hunt_results: `## Environment Threat Hunt Results

### URL: secure-bankl0gin.suspicious-domain.xyz
- **DNS Logs (logs-dns*):** 2 hits found
  - Host: WORKSTATION-14 resolved domain at 2026-04-26T14:32:11Z
  - Host: LAPTOP-MARKETING-03 resolved domain at 2026-04-26T15:01:44Z
- **Proxy Logs (logs-proxy*):** 1 hit found
  - Host: WORKSTATION-14 made HTTP GET request to the full URL at 2026-04-26T14:32:18Z (blocked by proxy)

### Domain: suspicious-domain.xyz
- **Network Flow (logs-network_traffic*):** 3 connections to IP 185.234.72.19 (resolved from domain)
  - All from WORKSTATION-14 between 14:32-14:35 UTC on 2026-04-26

### Assessment
One host (WORKSTATION-14) attempted to visit the malicious URL but was blocked by the proxy. A second host resolved the domain in DNS but did not make a connection. Recommend isolating WORKSTATION-14 for further investigation and notifying the user of LAPTOP-MARKETING-03.`,
  },
};

interface DemoExecution {
  startedAt: number;
  steps: StepExecution[];
  currentStepIndex: number;
  currentStepStartedAt: number;
  completed: boolean;
}

const demoExecutions = new Map<string, DemoExecution>();

export function createDemoExecution(): string {
  const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  demoExecutions.set(id, {
    startedAt: now,
    steps: DEMO_STEPS.map((s) => ({
      ...s,
      status: 'pending',
      logs: [],
    })),
    currentStepIndex: 0,
    currentStepStartedAt: now,
    completed: false,
  });

  return id;
}

export function getDemoStatus(executionId: string): WorkflowStatus | null {
  const exec = demoExecutions.get(executionId);
  if (!exec) return null;

  const now = Date.now();
  advanceDemo(exec, now);

  const allDone = exec.steps.every((s) => s.status === 'completed');
  const status = allDone ? 'completed' : 'running';

  return {
    executionId,
    status,
    steps: exec.steps.map((s) => ({ ...s })),
    output: allDone ? DEMO_OUTPUTS['step-6'] : undefined,
    startedAt: new Date(exec.startedAt).toISOString(),
    completedAt: allDone ? new Date(now).toISOString() : undefined,
  };
}

function advanceDemo(exec: DemoExecution, now: number) {
  if (exec.completed) return;

  while (exec.currentStepIndex < DEMO_STEPS.length) {
    const idx = exec.currentStepIndex;
    const duration = STEP_DURATIONS_MS[idx];
    const elapsed = now - exec.currentStepStartedAt;

    const step = exec.steps[idx];
    if (step.status === 'pending') {
      step.status = 'running';
      step.startedAt = new Date(exec.currentStepStartedAt).toISOString();
      step.logs = [
        {
          timestamp: new Date(exec.currentStepStartedAt).toISOString(),
          level: 'info',
          message: `Starting ${step.name}...`,
        },
      ];
    }

    if (elapsed >= duration) {
      step.status = 'completed';
      step.completedAt = new Date(exec.currentStepStartedAt + duration).toISOString();
      step.output = DEMO_OUTPUTS[step.id];
      step.logs = [
        ...(step.logs ?? []),
        {
          timestamp: new Date(exec.currentStepStartedAt + duration).toISOString(),
          level: 'info',
          message: `${step.name} completed successfully.`,
        },
      ];

      exec.currentStepIndex++;
      if (exec.currentStepIndex < DEMO_STEPS.length) {
        exec.currentStepStartedAt = exec.currentStepStartedAt + duration;
      } else {
        exec.completed = true;
      }
    } else {
      break;
    }
  }
}

export function isDemoExecution(executionId: string): boolean {
  return executionId.startsWith('demo-');
}
