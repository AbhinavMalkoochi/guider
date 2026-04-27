/**
 * Browser-side LLM client.
 *
 * Sends: question + current route + map (compacted) + screenshot (data URL)
 * to OpenAI chat completions with vision input.
 *
 * Returns: structured plan { steps: [...], confidence, fallbackMessage? }
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
    - "visualHint": describe the element visually (color, position on screen, surrounding text)
      so we can guide the user even if selectors fail.
    - "expectedRoute": if clicking navigates the user, the route they land on (else null).
- If you are NOT confident the element exists or you cannot infer it from map+screenshot,
  return confidence "low" and a "fallbackMessage" explaining what to do instead.
- Do not invent UI that is not in the map.
- Steps must be sequential — only the next-needed step's selectors matter at any moment, but
  you should plan the full path.

Output JSON shape:
{
  "steps": [
    { "title": "...", "body": "...", "selectors": [...], "visualHint": "...", "expectedRoute": "..." | null }
  ],
  "confidence": "high"|"medium"|"low",
  "fallbackMessage": "string|null"
}`;

export async function planGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  apiKey,
  model = 'gpt-5-nano-2025-08-07',
  endpoint = 'https://api.openai.com/v1/chat/completions',
}) {
  if (!apiKey) throw new Error('No OpenAI API key configured for the widget.');

  const compactMap = compactMap_(map, currentRoute);

  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `Current route: ${currentRoute}\n\n` +
              `User question: ${question}\n\n` +
              `Site map (compacted):\n${JSON.stringify(compactMap)}\n\n` +
              `Use the attached screenshot of the user's current viewport.`,
          },
          { type: 'image_url', image_url: { url: screenshotDataUrl } },
        ],
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Guider LLM failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    return {
      steps: [],
      confidence: 'low',
      fallbackMessage:
        "I'm not sure where to point you. Try rephrasing — e.g. 'How do I add a teammate?'",
    };
  }
}

function compactMap_(map, currentRoute) {
  if (!map?.pages) return { pages: [] };
  // Highlight the current page; trim others to essentials to stay token-efficient.
  return {
    pages: map.pages.map((p) => {
      const isCurrent = p.route === currentRoute;
      return {
        route: p.route,
        purpose: p.purpose || null,
        categories: p.categories || [],
        ...(isCurrent
          ? {
              summary: p.summary,
              interactive: p.interactive,
              visuals: p.visuals,
              modals: p.modals,
              dropdowns: p.dropdowns,
              conditions: p.conditions,
            }
          : {
              interactiveCount: (p.interactive || []).length,
              keyActions: (p.interactive || [])
                .slice(0, 6)
                .map((x) => x.label || x.purpose || x.tag),
            }),
      };
    }),
  };
}
