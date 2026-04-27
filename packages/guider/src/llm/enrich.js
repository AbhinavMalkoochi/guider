import OpenAI from 'openai';
import { ENRICH_SYSTEM_PROMPT, buildEnrichUserPayload } from './prompts.js';

export class LlmClient {
  constructor({ apiKey, model = 'gpt-5-nano-2025-08-07' }) {
    if (!apiKey) throw new Error('OPENAI_API_KEY is required for LLM enrichment.');
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Enrich a single page record. Returns refined JSON.
   *
   * Falls back gracefully on parse error: returns the raw page unchanged
   * with `confidence: "low"` so the verification UI can flag it.
   */
  async enrichPage(page) {
    const userPayload = buildEnrichUserPayload(page);
    try {
      const resp = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: ENRICH_SYSTEM_PROMPT },
          { role: 'user', content: userPayload },
        ],
        response_format: { type: 'json_object' },
      });
      const txt = resp.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(txt);
      return mergeEnrichment(page, parsed);
    } catch (e) {
      return { ...page, _enrichmentError: String(e?.message || e), confidence: 'low' };
    }
  }
}

function mergeEnrichment(page, enriched) {
  const out = { ...page };
  if (enriched.purpose) out.purpose = enriched.purpose;
  if (enriched.summary) out.summary = enriched.summary;
  if (Array.isArray(enriched.categories) && enriched.categories.length)
    out.categories = [...new Set([...(page.categories || []), ...enriched.categories])];
  if (Array.isArray(enriched.interactive))
    out.interactive = enriched.interactive.map((e, i) => ({
      ...(page.interactive[i] || {}),
      ...e,
    }));
  if (Array.isArray(enriched.visuals))
    out.visuals = enriched.visuals.map((e, i) => ({
      ...(page.visuals[i] || {}),
      ...e,
    }));
  if (Array.isArray(enriched.modals)) out.modals = enriched.modals;
  if (Array.isArray(enriched.dropdowns)) out.dropdowns = enriched.dropdowns;
  out.confidence = enriched.confidence || 'medium';
  return out;
}
