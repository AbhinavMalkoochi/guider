import { runPlan } from './runner.js';
import * as highlight from '../widget/highlight';

type PlanStep = {
  title: string;
  body?: string;
  selectors: Array<Record<string, unknown>>;
  visualHint?: string;
  expectedRoute?: string | null;
  action?: { kind: string; value?: unknown; key?: string };
};

type Plan = {
  steps: PlanStep[];
  confidence: 'high' | 'medium' | 'low';
  fallbackMessage?: string | null;
};

type ProgressEvent = {
  phase: 'starting' | 'completed' | 'failed';
  index: number;
  step: PlanStep;
  action?: string;
  error?: string;
};

export const agentMode = {
  available: true,
  async run({
    plan,
    onProgress,
    signal,
    showHighlight = true,
  }: {
    plan: Plan;
    onProgress?: (event: ProgressEvent) => void;
    signal?: AbortSignal;
    showHighlight?: boolean;
  }) {
    const progressHandler = onProgress
      ? ((event: unknown) => onProgress(event as ProgressEvent))
      : undefined;
    return runPlan(plan as never, {
      onProgress: progressHandler as unknown as (() => void) | undefined,
      signal,
      showHighlight,
      highlight,
    } as never);
  },
};

export { runPlan };