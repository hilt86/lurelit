export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'waiting';

export interface StepExecution {
  id: string;
  stepId: string;
  name: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  logs?: LogEntry[];
  waitingMessage?: string;
  waitingSchema?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  stepExecutionId?: string;
}

export interface WorkflowStatus {
  executionId: string;
  status: ExecutionStatus;
  steps: StepExecution[];
  output?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  screenshot?: string;
  mediaType?: string;
  executedBy?: string;
  enrichmentDetails?: EnrichmentDetail[];
  totalSteps?: number;
  isAwaitingInput?: boolean;
}

export interface EnrichmentDetail {
  iocType: string;
  iocValue: string;
  sources: EnrichmentSource[];
}

export interface EnrichmentSource {
  name: string;
  status: 'clean' | 'malicious' | 'suspicious' | 'unknown' | 'error' | 'no_results';
  stats?: { malicious: number; suspicious: number; harmless: number; undetected: number };
  resultsCount?: number;
  url?: string;
  raw?: Record<string, unknown>;
}

export interface SubmitResponse {
  executionId: string;
}

export interface SubmitRequest {
  image: string;
}
