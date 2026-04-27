/**
 * Browser-side LLM client (chat completions w/ vision).
 *
 * Two modes:
 *   1. planGuidance(...)        — single round-trip, awaits full JSON
 *   2. streamPlanGuidance(...)  — Server-Sent Events from a server proxy that
 *                                  forwards OpenAI streaming. Each chunk is
 *                                  partial JSON; we yield steps as they arrive.
 *
 * Mode 2 is preferred when you ship a proxy: first highlight appears in <1s
 * because we render the first step before the LLM has finished planning the rest.
 */
const SYSTEM = `You are Guider, a navigation assistant embedded in a Next.js app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: produce a step-by-step plan that points the user to the exact element(s) they need.

Strict rules:
- Use the screenshot to verify what is currently visible AND the map to know what exists.
- For each step, return:
    - "title": short imperative (e.g., "Open the Settings menu")
    - "body": one-sentence user-facing explanation
    - "selectors": ranked candidates (most stable first). Each is one of:
        { "kind": "data-guider", "value": "..." }
        { "kind": "testid",      "value": "..." }
        { "kind": "aria",        "value": "..." }
        { "kind": "role-name",   "role": "button"|"link"|"tab"|..., "name": "..." }
        { "kind": "text",        "value": "...", "tag": "button|a|..." }
        { "kind": "css",         "value": "..." }
    - "visualHint": describe the element visually (color, position, surrounding text).
    - "expectedRoute": if clicking navigates the user, the route they land on (else null).
    - "action": optional. { "kind": "click" } (default) | { "kind": "type", "value": "..." } |
                { "kind": "select", "value": "..." } | { "kind": "press", "key": "Enter" }.
- If you are NOT confident the element exists, return confidence "low" and a "fallbackMessage".
- Do not invent UI not in the map. Steps must be sequential.

Output JSON shape:
{ "steps": [...], "confidence": "high"|"medium"|"low", "fallbackMessage": "string|null" }`;

function compactMap(map, currentRoute) {
  if (!map?.pages) return { pages: [] };
  return {
    pages: map.pages.map((p) => {
      const isCurrent = p.route === currentRoute;
      return {
        route: p.route,
        purpose: p.purpose || null,
        categories: p.categories || [],
        ...(isCurrent
          ? { summary: p.summary, interactive: p.interactive, visuals: p.visuals,
              modals: p.modals, dropdowns: p.dropdowns, conditions: p.conditions }
          : { interactiveCount: (p.interactive || []).length,
              keyActions: (p.interactive || []).slice(0, 6).map((x) => x.label || x.purpose || x.tag) }),
      };
    }),
  };
}

function buildMessages({ question, currentRoute, map, screenshotDataUrl }) {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        { type: 'text',
          text: `Current route: ${currentRoute}\n\nUser question: ${question}\n\nSite map (compacted):\n${JSON.stringify(compactMap(map, currentRoute))}\n\nUse the attached screenshot of the user's current viewport.` },
        { type: 'image_url', image_url: { url: screenshotDataUrl } },
      ],
    },
  ];
}

export async function planGuidance({
  question, currentRoute, map, screenshotDataUrl,
  apiKey, model = 'gpt-5-nano-2025-08-07',
  endpoint = 'https://api.openai.com/v1/chat/completions',
  proxy = null,
  signal,
}) {
  const url = proxy?.plan || endpoint;
  const headers = { 'Content-Type': 'application/json' };
  if (!proxy && apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body = proxy
    ? { question, currentRoute, mapVersion: map?.version, screenshotDataUrl }
    : {
        model,
        response_format: { type: 'json_object' },
        messages: buildMessages({ question, currentRoute, map, screenshotDataUrl }),
      };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Guider plan failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = proxy ? JSON.stringify(data) : (data.choices?.[0]?.message?.content || '{}');
  try { return JSON.parse(content); }
  catch {
    return { steps: [], confidence: 'low',
             fallbackMessage: "I'm not sure where to point you. Try rephrasing." };
  }
}

/**
 * Stream guidance via SSE from a server proxy. The proxy is expected to:
 *   - Open a `text/event-stream` connection
 *   - Emit `event: step` data: <one step JSON> for each step as soon as it's ready
 *   - Emit `event: done` data: { confidence, fallbackMessage } at the end
 *
 * Calls `onStep(step, index)` as steps arrive and resolves with the full plan.
 */
export async function streamPlanGuidance({
  question, currentRoute, map, screenshotDataUrl,
  proxyUrl, signal, onStep,
}) {
  if (!proxyUrl) throw new Error('streamPlanGuidance requires proxyUrl.');
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question, currentRoute, mapVersion: map?.version, screenshotDataUrl }),
    signal,
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Guider stream failed (${res.status}): ${txt.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const steps = [];
  let confidence = 'medium';
  let fallbackMessage = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const ev = parseSse(raw);
      if (!ev) continue;
      if (ev.event === 'step') {
        try {
          const s = JSON.parse(ev.data);
          steps.push(s);
          onStep?.(s, steps.length - 1);
        } catch {}
      } else if (ev.event === 'done') {
        try { const d = JSON.parse(ev.data); confidence = d.confidence || confidence; fallbackMessage = d.fallbackMessage || null; } catch {}
      } else if (ev.event === 'error') {
        throw new Error(ev.data || 'stream error');
      }
    }
  }

  return { steps, confidence, fallbackMessage };
}

function parseSse(raw) {
  let event = 'message', data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
  }
  return data ? { event, data } : null;
}
