/**
 * Agent Mode — runs a step plan autonomously.
 *
 * Behavior:
 *   - For each step:
 *       1. Resolve target via accessibility-tree-first selector strategy
 *       2. Decide action: click | type | select | press
 *       3. Execute via interact.js
 *       4. Wait for DOM settle + optional route change
 *       5. Emit progress to the caller (so the widget can show a live trace)
 *   - On failure or unexpected state, the runner can request a *re-plan* by
 *     surfacing the error to the caller (which re-screenshots + re-asks the LLM).
 *
 * Limits (documented):
 *   - Cannot bypass `isTrusted` — APIs requiring user activation will refuse.
 *     We detect & report instead of silently failing.
 *   - We don't cross iframes by default.
 */
import { findElement } from '../widget/selectors.js';
import { click, type, selectOption, press, waitForSettle, waitForRoute, sleep } from './interact.js';

export async function runPlan(plan, {
  onProgress = () => {},
  signal,
  perStepTimeoutMs = 8000,
  showHighlight = true,
  highlight,    // optional reference to widget/highlight.js
} = {}) {
  if (!plan?.steps?.length) return { status: 'completed', steps: [] };
  const trace = [];

  for (let i = 0; i < plan.steps.length; i++) {
    if (signal?.aborted) {
      cleanupHighlight(highlight);
      return { status: 'aborted', steps: trace };
    }

    const step = plan.steps[i];
    onProgress({ phase: 'starting', index: i, step });

    const found = findElement(step.selectors);
    if (!found) {
      const err = `Step ${i + 1}: couldn't find "${step.title}". Hint: ${step.visualHint || '(none)'}.`;
      onProgress({ phase: 'failed', index: i, step, error: err });
      trace.push({ index: i, status: 'not-found', step });
      cleanupHighlight(highlight);
      return { status: 'failed', steps: trace, reason: 'element-not-found', failedStep: i };
    }
    const el = found.el;

    // Optional: highlight while we act so the user can watch
    if (showHighlight && highlight?.show) {
      try {
        await highlight.show({
          element: el,
          title: step.title,
          body: step.body || step.visualHint,
          stepIndex: i,
          totalSteps: plan.steps.length,
          onNext: () => {},
          onSkip: () => {},
        });
      } catch {}
    }

    const action = inferAction(step, el);

    try {
      const fromRoute = window.location.pathname;
      await Promise.race([
        executeAction(action, el),
        timeout(perStepTimeoutMs, `Step ${i + 1}: timed out`),
      ]);
      // Wait for the page to settle / navigate
      await waitForSettle({ quietMs: 300, timeoutMs: Math.min(perStepTimeoutMs, 4000) });
      if (step.expectedRoute && step.expectedRoute !== fromRoute) {
        await waitForRoute({ from: fromRoute, timeoutMs: 4000 });
      }
      trace.push({ index: i, status: 'ok', step, action: action.kind });
      onProgress({ phase: 'completed', index: i, step, action: action.kind });
      await sleep(150); // brief pause between steps for stability
    } catch (e) {
      const reason = String(e?.message || e);
      trace.push({ index: i, status: 'error', step, error: reason });
      onProgress({ phase: 'failed', index: i, step, error: reason });
      cleanupHighlight(highlight);
      return { status: 'failed', steps: trace, reason, failedStep: i };
    }
  }

  cleanupHighlight(highlight);
  return { status: 'completed', steps: trace };
}

function cleanupHighlight(highlight) {
  if (highlight?.cleanup) try { highlight.cleanup(); } catch {}
}

function inferAction(step, el) {
  // The LLM may explicitly tell us the action; otherwise infer from the element.
  const a = step.action;
  if (a?.kind === 'type' && a.value != null) return { kind: 'type', value: String(a.value), clear: a.clear !== false };
  if (a?.kind === 'select' && a.value != null) return { kind: 'select', value: String(a.value) };
  if (a?.kind === 'press' && a.key) return { kind: 'press', key: a.key };
  if (a?.kind === 'click') return { kind: 'click' };

  // Heuristic
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' && /^(text|email|password|search|url|tel|number)?$/.test(el.type || '')) {
    if (step.value != null) return { kind: 'type', value: step.value };
  }
  if (tag === 'textarea' && step.value != null) return { kind: 'type', value: step.value };
  if (tag === 'select' && step.value != null) return { kind: 'select', value: step.value };
  return { kind: 'click' };
}

async function executeAction(action, el) {
  switch (action.kind) {
    case 'click':  return click(el);
    case 'type':   return type(el, action.value, { clear: action.clear });
    case 'select': return selectOption(el, action.value);
    case 'press':  return press(el, action.key);
    default: throw new Error(`unknown action ${action.kind}`);
  }
}

function timeout(ms, msg) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}
