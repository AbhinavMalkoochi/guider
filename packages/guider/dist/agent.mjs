// src/agent/index.js
var agentMode = {
  /** Whether agent mode is wired up (always false until implemented). */
  available: false,
  /**
   * Future entry point.
   * @param {{ plan: object, controls?: { abort?: AbortController } }} args
   * @returns {Promise<{ status: 'completed'|'failed'|'aborted', steps: object[] }>}
   */
  async run(args) {
    throw new Error("Guider Agent Mode is not implemented yet. This is a scaffold for a future release.");
  }
};
export {
  agentMode
};
