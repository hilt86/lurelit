'use client';

import type { StepExecution } from '@/lib/types';
import StepCard from './StepCard';

export default function WorkflowTimeline({ steps }: { steps: StepExecution[] }) {
  if (steps.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '64px 0' }}>
        <div className="animate-spin-slow" style={{ width: 48, height: 48, border: '2px solid var(--border-strong)', borderTopColor: 'var(--teal)', borderRadius: '50%' }} />
        <p className="label" style={{ color: 'var(--text-faint)' }}>Initializing workflow...</p>
      </div>
    );
  }

  const runningIdx = steps.findIndex(s => s.status === 'running');

  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
      {steps.map((step, i) => (
        <StepCard
          key={step.id}
          step={step}
          index={i}
          isLast={i === steps.length - 1}
          hasRunningBefore={runningIdx >= 0 && i > runningIdx}
        />
      ))}
    </div>
  );
}
