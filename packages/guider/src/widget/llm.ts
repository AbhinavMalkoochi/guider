import type { SelectorCandidate } from './selectors';

type MapData = Record<string, unknown> | null;

export interface GuidanceTarget {
  title: string;
  body?: string;
  selectors?: SelectorCandidate[];
  visualHint?: string;
  expectedRoute?: string | null;
}

export interface GuidanceResponse {
  summary?: string | null;
  immediateSpeech?: string | null;
  target: GuidanceTarget | null;
  routeIntent?: string | null;
  confidence: 'high' | 'medium' | 'low';
  fallbackMessage?: string | null;
}

const SYSTEM = `You are Guider, a navigation assistant embedded in a web app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: return one grounded guidance target that the user can act on right now.

Strict rules:
- Use the screenshot to verify what is currently visible and the map to know what exists.
- Never invent UI or routes that are not supported by the map.
- Return exactly one best target, not a multi-step plan.
- If the answer is not supported by the map or the current screenshot, return confidence "low"
  and a fallbackMessage that clearly says you cannot verify it.

Output JSON shape:
{
  "summary": "short summary",
  "immediateSpeech": "one short sentence the assistant can say immediately",
  "target": {
    "title": "short imperative",
    "body": "one sentence explaining what to do",
    "selectors": [
      { "kind": "data-guider", "value": "..." },
      { "kind": "testid", "value": "..." },
      { "kind": "aria", "value": "..." },
      { "kind": "role-name", "role": "button", "name": "..." },
      { "kind": "text", "value": "...", "tag": "button" },
      { "kind": "css", "value": "..." }
    ],
    "visualHint": "describe the element visually",
    "expectedRoute": "route or null"
  },
  "routeIntent": "route or null",
  "confidence": "high"|"medium"|"low",
  "fallbackMessage": "string|null"
}`;

function compactMap(map: MapData, currentRoute: string) {
  const pages = Array.isArray((map as { pages?: unknown[] } | null)?.pages)
    ? ((map as { pages: Record<string, unknown>[] }).pages)
    : [];

  return {
    pages: pages.map((page) => {
      const isCurrent = page.route === currentRoute;
      return {
        route: page.route,
        purpose: page.purpose || null,
        categories: page.categories || [],
        ...(isCurrent
          ? {
              summary: page.summary,
              interactive: page.interactive,
              visuals: page.visuals,
              modals: page.modals,
              dropdowns: page.dropdowns,
              conditions: page.conditions,
            }
          : {
              interactiveCount: Array.isArray(page.interactive) ? page.interactive.length : 0,
              keyActions: Array.isArray(page.interactive)
                ? page.interactive.slice(0, 6).map((entry: Record<string, unknown>) => entry.label || entry.purpose || entry.tag)
                : [],
            }),
      };
    }),
  };
}

function buildMessages({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
}: {
  question: string;
  currentRoute: string;
  map: MapData;
  screenshotDataUrl: string;
}) {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Current route: ${currentRoute}\n\nUser question: ${question}\n\nSite map (compacted):\n${JSON.stringify(compactMap(map, currentRoute))}\n\nUse the attached screenshot of the user's current viewport.`,
        },
        { type: 'image_url', image_url: { url: screenshotDataUrl } },
      ],
    },
  ];
}

export async function planGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  apiKey,
  model = 'gpt-5-nano-2025-08-07',
  endpoint = 'https://api.openai.com/v1/chat/completions',
  proxy = null,
  signal,
}: {
  question: string;
  currentRoute: string;
  map: MapData;
  screenshotDataUrl: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  proxy?: { plan?: string } | null;
  signal?: AbortSignal;
}) {
  const url = proxy?.plan || endpoint;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!proxy && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const body = proxy
    ? { question, currentRoute, mapVersion: (map as { version?: string } | null)?.version, screenshotDataUrl }
    : {
        model,
        response_format: { type: 'json_object' },
        messages: buildMessages({ question, currentRoute, map, screenshotDataUrl }),
      };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Guider plan failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = proxy ? JSON.stringify(data) : (data.choices?.[0]?.message?.content || '{}');
  try {
    return validateGuidance(JSON.parse(content), map);
  } catch {
    return emptyGuidance("I'm not sure where to point you. Try rephrasing.");
  }
}

export async function streamPlanGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  proxyUrl,
  signal,
  onAck,
  onTarget,
}: {
  question: string;
  currentRoute: string;
  map: MapData;
  screenshotDataUrl: string;
  proxyUrl: string;
  signal?: AbortSignal;
  onAck?: (message: string | null) => void;
  onTarget?: (target: GuidanceTarget | null) => void;
}) {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question, currentRoute, mapVersion: (map as { version?: string } | null)?.version, screenshotDataUrl }),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`Guider stream failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let guidance = emptyGuidance();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex;
    while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const event = parseSse(raw);
      if (!event) continue;

      if (event.event === 'ack') {
        try {
          const payload = JSON.parse(event.data) as { message?: string | null };
          onAck?.(payload.message || null);
        } catch {
          onAck?.(null);
        }
        continue;
      }

      if (event.event === 'target') {
        try {
          const payload = JSON.parse(event.data);
          guidance = { ...guidance, ...validateGuidance(payload, map) };
          onTarget?.(guidance.target);
        } catch {
          guidance = emptyGuidance("I'm not sure where to point you. Try rephrasing.");
        }
        continue;
      }

      if (event.event === 'done') {
        try {
          const payload = JSON.parse(event.data);
          guidance = validateGuidance({ ...guidance, ...payload }, map);
        } catch {
          guidance = emptyGuidance("I'm not sure where to point you. Try rephrasing.");
        }
        continue;
      }

      if (event.event === 'error') {
        throw new Error(event.data || 'stream error');
      }
    }
  }

  return validateGuidance(guidance, map);
}

function parseSse(raw: string) {
  let event = 'message';
  let data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
  }
  return data ? { event, data } : null;
}

function validateGuidance(payload: unknown, map: MapData): GuidanceResponse {
  const parsed = (payload && typeof payload === 'object' ? payload : {}) as Partial<GuidanceResponse>;
  const target = parsed.target && isMapBackedTarget(parsed.target, map) ? normalizeTarget(parsed.target) : null;
  const routeIntent = typeof parsed.routeIntent === 'string' ? parsed.routeIntent : null;
  const routeExists = !routeIntent || routeInMap(map, routeIntent);

  if (!target || !routeExists) {
    return emptyGuidance(parsed.fallbackMessage || "I can't verify that from the site map and current screen.");
  }

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : null,
    immediateSpeech: typeof parsed.immediateSpeech === 'string' ? parsed.immediateSpeech : null,
    target,
    routeIntent,
    confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'medium',
    fallbackMessage: typeof parsed.fallbackMessage === 'string' ? parsed.fallbackMessage : null,
  };
}

function normalizeTarget(target: Partial<GuidanceTarget>): GuidanceTarget | null {
  if (!target.title || !Array.isArray(target.selectors) || target.selectors.length === 0) {
    return null;
  }
  return {
    title: target.title,
    body: typeof target.body === 'string' ? target.body : '',
    selectors: target.selectors,
    visualHint: typeof target.visualHint === 'string' ? target.visualHint : '',
    expectedRoute: typeof target.expectedRoute === 'string' ? target.expectedRoute : null,
  };
}

function emptyGuidance(fallbackMessage = "I can't verify that from the site map and current screen."): GuidanceResponse {
  return {
    summary: null,
    immediateSpeech: null,
    target: null,
    routeIntent: null,
    confidence: 'low',
    fallbackMessage,
  };
}

function isMapBackedTarget(target: Partial<GuidanceTarget>, map: MapData) {
  if (!Array.isArray(target.selectors) || target.selectors.length === 0) {
    return false;
  }

  const pages = Array.isArray((map as { pages?: unknown[] } | null)?.pages)
    ? ((map as { pages: Array<Record<string, unknown>> }).pages)
    : [];
  const interactiveEntries = pages.flatMap((page) =>
    Array.isArray(page.interactive) ? page.interactive as Array<Record<string, unknown>> : [],
  );

  return target.selectors.some((selector) => matchesInteractive(selector, interactiveEntries));
}

function matchesInteractive(selector: SelectorCandidate, entries: Array<Record<string, unknown>>) {
  if (typeof selector === 'string') {
    return false;
  }
  return entries.some((entry) => {
    const label = String(entry.label || '').toLowerCase();
    const guiderId = String(entry.guiderId || '').toLowerCase();
    const testId = String(entry.testId || '').toLowerCase();
    const ariaLabel = String((entry.aria as { label?: string } | undefined)?.label || '').toLowerCase();
    switch (selector.kind) {
      case 'data-guider':
        return guiderId && guiderId === String(selector.value || '').toLowerCase();
      case 'testid':
        return testId && testId === String(selector.value || '').toLowerCase();
      case 'aria':
        return ariaLabel && ariaLabel === String(selector.value || '').toLowerCase();
      case 'text':
        return label.includes(String(selector.value || '').toLowerCase());
      case 'role-name':
        return label.includes(String(selector.name || '').toLowerCase());
      default:
        return false;
    }
  });
}

function routeInMap(map: MapData, route: string) {
  const pages = Array.isArray((map as { pages?: unknown[] } | null)?.pages)
    ? ((map as { pages: Array<Record<string, unknown>> }).pages)
    : [];
  return pages.some((page) => page.route === route);
}