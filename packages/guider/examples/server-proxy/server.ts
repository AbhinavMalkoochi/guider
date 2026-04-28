import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

type InteractiveEntry = {
  label?: string;
  guiderId?: string;
  testId?: string;
  aria?: { label?: string | null };
};

type SitePage = {
  route: string;
  purpose?: string | null;
  categories?: string[];
  interactive?: InteractiveEntry[];
  summary?: string;
  visuals?: unknown[];
  modals?: unknown[];
  dropdowns?: unknown[];
  conditions?: unknown[];
};

type SiteMap = { pages: SitePage[] };

const app = express();
app.use(express.json({ limit: '12mb' }));

const port = process.env.PORT || 4747;
const model = process.env.GUIDER_MODEL || 'gpt-5-nano-2025-08-07';
const mapPath = process.env.GUIDER_MAP || './guider.map.json';
const allowedOrigin = process.env.GUIDER_ALLOWED_ORIGIN || '*';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  next();
});

let mapCache: SiteMap | null = null;

async function loadMap() {
  if (mapCache) return mapCache;
  try {
    mapCache = JSON.parse(await fs.readFile(path.resolve(mapPath), 'utf8')) as SiteMap;
  } catch {
    mapCache = { pages: [] };
  }
  return mapCache;
}

const system = `You are Guider, a navigation assistant embedded in a web app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: return one grounded guidance target that the user can act on right now.

Output ONE JSON object. No prose, no markdown. Shape:
{
  "summary": "short summary",
  "immediateSpeech": "one short sentence the assistant can say immediately",
  "target": {
    "title": "...",
    "body": "...",
    "selectors": [
      { "kind": "data-guider"|"testid"|"aria"|"role-name"|"text"|"css", "value":"...", "role":"...", "name":"...", "tag":"..." }
    ],
    "visualHint": "...",
    "expectedRoute": "..." | null
  },
  "routeIntent": "..." | null,
  "confidence": "high"|"medium"|"low",
  "fallbackMessage": "string|null"
}
Rules:
- Use the screenshot for what's visible and the map for what exists.
- Return exactly one best target, not a multi-step plan.
- Never invent UI or routes that are not in the map.
- If unsure, set confidence to "low" with a fallbackMessage.`;

function compactMap(map: SiteMap, currentRoute: string) {
  return {
    pages: (map.pages || []).map((page) => {
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
              interactiveCount: (page.interactive || []).length,
              keyActions: (page.interactive || []).slice(0, 6).map((entry) => entry.label || ''),
            }),
      };
    }),
  };
}

app.post('/guider/plan', async (request, response) => {
  const { question, currentRoute, screenshotDataUrl } = request.body || {};
  if (!question || !screenshotDataUrl) {
    response.status(400).json({ error: 'missing question or screenshot' });
    return;
  }

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send('ack', { message: 'Finding the best place on this screen.' });
    const map = await loadMap();
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Current route: ${currentRoute}\n\nUser question: ${question}\n\nSite map (compacted):\n${JSON.stringify(compactMap(map, currentRoute))}\n\nUse the attached screenshot.`,
          },
          { type: 'image_url', image_url: { url: screenshotDataUrl } },
        ],
      },
    ];

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages,
    });
    const content = completion.choices?.[0]?.message?.content || '{}';
    const guidance = validateGuidance(JSON.parse(content), map);
    if (guidance.target) {
      send('target', guidance);
    }
    send('done', guidance);
    response.end();
  } catch (error) {
    send('error', String(error instanceof Error ? error.message : error));
    response.end();
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.post('/guider/transcribe', upload.single('file'), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: 'no file' });
    return;
  }
  try {
    const file = await OpenAI.toFile(request.file.buffer, request.file.originalname || 'voice.webm', { type: request.file.mimetype });
    const transcription = await openai.audio.transcriptions.create({ file, model: 'gpt-4o-mini-transcribe' });
    response.json({ text: transcription.text || '' });
  } catch (error) {
    response.status(500).json({ error: String(error instanceof Error ? error.message : error) });
  }
});

app.get('/guider/health', (_, response) => {
  response.json({ ok: true, model });
});

app.listen(port, () => {
  console.log(`Guider proxy -> http://localhost:${port}`);
});

function validateGuidance(payload: any, map: SiteMap) {
  const target = isMapBackedTarget(payload?.target, map) ? normalizeTarget(payload?.target) : null;
  const routeIntent = typeof payload?.routeIntent === 'string' ? payload.routeIntent : null;
  const routeExists = !routeIntent || map.pages.some((page) => page.route === routeIntent);
  if (!target || !routeExists) {
    return {
      summary: null,
      immediateSpeech: null,
      target: null,
      routeIntent: null,
      confidence: 'low',
      fallbackMessage: payload?.fallbackMessage || "I can't verify that from the site map and current screen.",
    };
  }
  return {
    summary: typeof payload?.summary === 'string' ? payload.summary : null,
    immediateSpeech: typeof payload?.immediateSpeech === 'string' ? payload.immediateSpeech : null,
    target,
    routeIntent,
    confidence: payload?.confidence === 'high' || payload?.confidence === 'medium' ? payload.confidence : 'medium',
    fallbackMessage: typeof payload?.fallbackMessage === 'string' ? payload.fallbackMessage : null,
  };
}

function normalizeTarget(target: any) {
  if (!target || typeof target.title !== 'string' || !Array.isArray(target.selectors) || target.selectors.length === 0) {
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

function isMapBackedTarget(target: any, map: SiteMap) {
  if (!target || !Array.isArray(target.selectors) || target.selectors.length === 0) {
    return false;
  }

  const entries = map.pages.flatMap((page) => page.interactive || []);
  return target.selectors.some((selector: any) => {
    if (!selector || typeof selector !== 'object') return false;
    return entries.some((entry) => {
      const label = String(entry.label || '').toLowerCase();
      const guiderId = String(entry.guiderId || '').toLowerCase();
      const testId = String(entry.testId || '').toLowerCase();
      const ariaLabel = String(entry.aria?.label || '').toLowerCase();
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
  });
}