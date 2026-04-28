import { httpAction } from "./_generated/server";
import { OpenAI } from "openai";
import { toFile } from "openai/uploads";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYSTEM_PROMPT = `You are Guider, a navigation assistant embedded in a web app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: return one grounded guidance target that the user can act on right now.

Output ONE JSON object (no prose, no markdown). Shape:
{
  "summary": "short summary",
  "immediateSpeech": "one short sentence the assistant can say immediately",
  "target": {
    "title": "...",
    "body": "...",
    "selectors": [
      { "kind": "data-guider"|"testid"|"aria"|"role-name"|"text"|"css",
        "value":"...", "role":"...", "name":"...", "tag":"..." }
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
- If unsure, confidence must be "low" with a fallbackMessage.
`;

function compactMap(m: any, currentRoute: string) {
  const pages: any[] = [];
  for (const p of (m.pages || [])) {
    const isCurrent = p.route === currentRoute;
    const base: any = {
      route: p.route,
      purpose: p.purpose,
      categories: p.categories || [],
    };
    if (isCurrent) {
      for (const k of ["summary", "interactive", "visuals", "modals", "dropdowns", "conditions"]) {
        if (p[k] !== undefined) base[k] = p[k];
      }
    } else {
      base.interactiveCount = (p.interactive || []).length;
      base.keyActions = (p.interactive || []).slice(0, 6).map((x: any) => x.label || x.purpose || x.tag);
    }
    pages.push(base);
  }
  return { pages };
}

export const plan = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { question, currentRoute, screenshotDataUrl } = await request.json();

  let siteMap: { pages: any[] } = { pages: [] };
  try {
    // Attempt to fetch the map from the local dev server or prod URL
    // For this convex proxy, we assume map is hosted on the same origin as the request
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const mapReq = await fetch(`${origin}/guider.map.json`);
    if (mapReq.ok) {
      const fullMap = await mapReq.json();
      siteMap = compactMap(fullMap, currentRoute || "/");
    }
  } catch (e) {
    console.error("Failed to load map", e);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.GUIDER_MODEL || "gpt-4o-mini"; // Using standard model since nano might not be available

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sse = (event: string, data: any) => {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    writer.write(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
  };

  // Run async processing to pipe to stream
  (async () => {
    try {
      sse("ack", { message: "Finding the best place on this screen." });

      const messages: any[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Current route: ${currentRoute}\n\nUser question: ${question}\n\nSite map (compacted):\n${JSON.stringify(siteMap)}\n\nUse the attached screenshot of the user's current viewport.`,
            },
            { type: "image_url", image_url: { url: screenshotDataUrl } },
          ],
        },
      ];

      const resp = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages,
      });

      const content = resp.choices[0].message.content || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        sse("error", "parse-failure");
        sse("done", { confidence: "low", fallbackMessage: "Plan parse failed." });
        await writer.close();
        return;
      }

      const guidance = validateGuidance(parsed, siteMap);
      if (guidance.target) {
        sse("target", guidance);
      }

      sse("done", {
        summary: guidance.summary,
        immediateSpeech: guidance.immediateSpeech,
        routeIntent: guidance.routeIntent,
        confidence: guidance.confidence,
        fallbackMessage: guidance.fallbackMessage,
      });
    } catch (e: any) {
      sse("error", e.message);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

export const transcribe = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: "No audio file provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const filename = file instanceof File && file.name ? file.name : inferAudioFilename(file.type);
    const upload = await toFile(await file.arrayBuffer(), filename, { type: file.type || "audio/webm" });
    const response = await openai.audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Transcription failed", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Transcription failed.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function inferAudioFilename(contentType: string) {
  if (contentType.includes("mp4")) return "voice.mp4";
  if (contentType.includes("ogg")) return "voice.ogg";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "voice.mp3";
  if (contentType.includes("wav")) return "voice.wav";
  return "voice.webm";
}

function validateGuidance(payload: any, siteMap: { pages: any[] }) {
  const target = isMapBackedTarget(payload?.target, siteMap) ? normalizeTarget(payload.target) : null;
  const routeIntent = typeof payload?.routeIntent === "string" ? payload.routeIntent : null;
  const routeExists = !routeIntent || siteMap.pages.some((page: any) => page.route === routeIntent);

  if (!target || !routeExists) {
    return {
      summary: null,
      immediateSpeech: null,
      target: null,
      routeIntent: null,
      confidence: "low",
      fallbackMessage: payload?.fallbackMessage || "I can't verify that from the site map and current screen.",
    };
  }

  return {
    summary: typeof payload?.summary === "string" ? payload.summary : null,
    immediateSpeech: typeof payload?.immediateSpeech === "string" ? payload.immediateSpeech : null,
    target,
    routeIntent,
    confidence: payload?.confidence === "high" || payload?.confidence === "medium" ? payload.confidence : "medium",
    fallbackMessage: typeof payload?.fallbackMessage === "string" ? payload.fallbackMessage : null,
  };
}

function normalizeTarget(target: any) {
  if (!target || typeof target.title !== "string" || !Array.isArray(target.selectors) || target.selectors.length === 0) {
    return null;
  }
  return {
    title: target.title,
    body: typeof target.body === "string" ? target.body : "",
    selectors: target.selectors,
    visualHint: typeof target.visualHint === "string" ? target.visualHint : "",
    expectedRoute: typeof target.expectedRoute === "string" ? target.expectedRoute : null,
  };
}

function isMapBackedTarget(target: any, siteMap: { pages: any[] }) {
  if (!target || !Array.isArray(target.selectors) || target.selectors.length === 0) {
    return false;
  }

  const interactive = siteMap.pages.flatMap((page: any) => page.interactive || []);
  return target.selectors.some((selector: any) => {
    if (!selector || typeof selector !== "object") return false;
    return interactive.some((entry: any) => {
      const label = String(entry.label || "").toLowerCase();
      const guiderId = String(entry.guiderId || "").toLowerCase();
      const testId = String(entry.testId || "").toLowerCase();
      const ariaLabel = String(entry.aria?.label || "").toLowerCase();
      switch (selector.kind) {
        case "data-guider":
          return guiderId && guiderId === String(selector.value || "").toLowerCase();
        case "testid":
          return testId && testId === String(selector.value || "").toLowerCase();
        case "aria":
          return ariaLabel && ariaLabel === String(selector.value || "").toLowerCase();
        case "text":
          return label.includes(String(selector.value || "").toLowerCase());
        case "role-name":
          return label.includes(String(selector.name || "").toLowerCase());
        default:
          return false;
      }
    });
  });
}
