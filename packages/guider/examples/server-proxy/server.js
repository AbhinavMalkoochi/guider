/**
 * Guider — minimal Node server proxy.
 *
 * Why: never ship your OpenAI key to the browser. Mount this behind your
 * existing auth, rate-limit it, and point <GuiderWidget proxyUrl="..."
 * whisperUrl="..." />.
 *
 * Endpoints:
 *   POST /guider/plan          → SSE stream of step events, then `done`
 *   POST /guider/transcribe    → multipart audio in, { text } out
 *
 * Run:
 *   OPENAI_API_KEY=sk-... node server.js
 *
 * The widget body shape is:
 *   { question: string, currentRoute: string, screenshotDataUrl: string, mapVersion?: string }
 *
 * The map itself is served from your origin (e.g., /guider.map.json) and
 * loaded by the widget client-side, so the proxy doesn't need to ship it.
 * For better quality, point the proxy at your map (PROXY reads it from disk
 * and includes it in the LLM call).
 */
import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '12mb' })); // screenshots are JPEG base64

const PORT = process.env.PORT || 4747;
const MODEL = process.env.GUIDER_MODEL || 'gpt-5-nano-2025-08-07';
const MAP_PATH = process.env.GUIDER_MAP || './guider.map.json';
const ALLOWED_ORIGIN = process.env.GUIDER_ALLOWED_ORIGIN || '*';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

let mapCache = null;
async function loadMap() {
  if (mapCache) return mapCache;
  try { mapCache = JSON.parse(await fs.readFile(path.resolve(MAP_PATH), 'utf8')); }
  catch { mapCache = { pages: [] }; }
  return mapCache;
}

const SYSTEM = `You are Guider, a navigation assistant embedded in a Next.js app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: produce a step-by-step plan that points the user to the exact element(s) they need.

Output ONE JSON object. No prose, no markdown. Shape:
{
  "steps": [
    { "title": "...", "body": "...",
      "selectors": [
        { "kind": "data-guider"|"testid"|"aria"|"role-name"|"text"|"css", "value":"...", "role":"...", "name":"...", "tag":"..." }
      ],
      "visualHint": "...",
      "expectedRoute": "..." | null,
      "action": { "kind":"click"|"type"|"select"|"press", "value":"...", "key":"..." }
    }
  ],
  "confidence": "high"|"medium"|"low",
  "fallbackMessage": "string|null"
}
Rules:
- Use the screenshot for what's visible; the map for what exists.
- Selectors ranked stable-first. Always include a visualHint as fallback.
- If unsure, set confidence "low" + fallbackMessage. Do not invent UI.`;

function compactMap(map, currentRoute) {
  return {
    pages: (map.pages || []).map((p) => {
      const isCurrent = p.route === currentRoute;
      return {
        route: p.route, purpose: p.purpose || null, categories: p.categories || [],
        ...(isCurrent
          ? { summary: p.summary, interactive: p.interactive, visuals: p.visuals,
              modals: p.modals, dropdowns: p.dropdowns, conditions: p.conditions }
          : { interactiveCount: (p.interactive || []).length,
              keyActions: (p.interactive || []).slice(0, 6).map((x) => x.label || x.purpose || x.tag) }),
      };
    }),
  };
}

app.post('/guider/plan', async (req, res) => {
  const { question, currentRoute, screenshotDataUrl } = req.body || {};
  if (!question || !screenshotDataUrl) return res.status(400).json({ error: 'missing question or screenshot' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const map = await loadMap();
    const messages = [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Current route: ${currentRoute}\n\nUser question: ${question}\n\nSite map (compacted):\n${JSON.stringify(compactMap(map, currentRoute))}\n\nUse the attached screenshot.` },
          { type: 'image_url', image_url: { url: screenshotDataUrl } },
        ],
      },
    ];

    // Two-pass approach: first ask for the full plan with json_object, then
    // emit each step on its own SSE line so the client can highlight as soon
    // as step 0 is ready. This is robust + simple — true token-streaming of
    // structured JSON is fragile because partial JSON isn't valid mid-stream.
    const resp = await openai.chat.completions.create({
      model: MODEL, response_format: { type: 'json_object' }, messages,
    });
    const txt = resp.choices?.[0]?.message?.content || '{}';
    let plan;
    try { plan = JSON.parse(txt); }
    catch {
      send('error', 'parse-failure');
      send('done', { confidence: 'low', fallbackMessage: 'Plan parse failed.' });
      return res.end();
    }

    for (const step of plan.steps || []) {
      send('step', step);
      // Tiny pause keeps the client UI responsive (first step paints
      // immediately, rest stream in over a couple hundred ms).
      await new Promise((r) => setTimeout(r, 30));
    }
    send('done', { confidence: plan.confidence || 'medium', fallbackMessage: plan.fallbackMessage || null });
    res.end();
  } catch (e) {
    send('error', String(e?.message || e));
    res.end();
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
app.post('/guider/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  try {
    const file = await OpenAI.toFile(req.file.buffer, req.file.originalname || 'voice.webm', { type: req.file.mimetype });
    const r = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
    res.json({ text: r.text || '' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/guider/health', (_, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, () => console.log(`Guider proxy → http://localhost:${PORT}`));
