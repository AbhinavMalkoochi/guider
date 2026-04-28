/**
 * Agent Mode — public entry.
 *
 * Replaces the previous scaffold. The runner is fully functional; what's
 * deliberately left for v1.1 is auto-replan on divergence (we report failures
 * back to the caller so the UI can re-ask the LLM with a fresh screenshot).
 */
import { runPlan } from './runner.js';
import * as highlight from '../widget/highlight';

export const agentMode = {
  available: true,
  /**
   * Execute a plan returned by the widget LLM.
   *
   * @param {{
   *   plan: { steps: Array<{ title:string, body?:string, selectors:any[], visualHint?:string,
   *                          expectedRoute?:string|null, action?:{kind:string, value?:any, key?:string} }>,
   *           confidence: 'high'|'medium'|'low' },
   *   onProgress?: (event: { phase: 'starting'|'completed'|'failed', index: number, step: object, action?: string, error?: string }) => void,
   *   signal?: AbortSignal,
   *   showHighlight?: boolean,
   * }} args
   */
  async run({ plan, onProgress, signal, showHighlight = true }) {
    return runPlan(plan, { onProgress, signal, showHighlight, highlight });
  },
};

export { runPlan };
