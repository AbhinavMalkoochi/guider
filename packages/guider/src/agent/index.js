/**
 * Agent Mode — SCAFFOLD ONLY.
 *
 * The intent: given a step plan from the LLM, the agent can autonomously execute
 * each step by directly interacting with the DOM (click, type, scroll, wait for
 * route changes) instead of just highlighting elements for the user to click.
 *
 * This is intentionally NOT implemented yet. The interface below is the
 * integration point for the future implementation. Throws on use.
 *
 * Hook-in points (search for "AGENT_HOOK"):
 *   - GuiderWidget.jsx → onAgentMode prop
 *   - This file       → run() should consume the same `plan` object that highlight.js
 *                        consumes today.
 *
 * When implemented, this file should:
 *   1. Take a plan (`{ steps: [...] }`) from llm.js
 *   2. For each step:
 *      - Resolve element via selectors.findElement
 *      - Dispatch synthetic interactions (.click(), input events, etc.)
 *      - Wait for the next expected route or DOM signal
 *      - Re-screenshot and re-plan if the page state diverges
 *   3. Optionally show the highlight overlay alongside auto-execution so the user
 *      can watch what the agent is doing.
 */
export const agentMode = {
  /** Whether agent mode is wired up (always false until implemented). */
  available: false,

  /**
   * Future entry point.
   * @param {{ plan: object, controls?: { abort?: AbortController } }} args
   * @returns {Promise<{ status: 'completed'|'failed'|'aborted', steps: object[] }>}
   */
  async run(args) { // eslint-disable-line no-unused-vars
    // AGENT_HOOK — implementation goes here. Intentionally throws.
    throw new Error('Guider Agent Mode is not implemented yet. This is a scaffold for a future release.');
  },
};
