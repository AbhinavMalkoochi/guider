"""
Guider — landing-site backend.

Two roles in one FastAPI app (everything mounted at /api):

1. Live-demo proxy for the embedded <GuiderWidget />:
     POST /api/guider/plan       → SSE stream of step events
     POST /api/guider/transcribe → multipart audio in, { text } out
   Mirrors examples/server-proxy/server.js so the landing page demo works
   end-to-end without exposing the OpenAI key to the browser.

2. Tiny "downloads" counter (MongoDB) for the landing page to show traction.
"""
import asyncio
import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from openai import AsyncOpenAI
from pydantic import BaseModel

load_dotenv()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GUIDER_MODEL = os.environ.get("GUIDER_MODEL", "gpt-5-nano-2025-08-07")
MAP_PATH = os.environ.get("GUIDER_MAP_PATH", "/app/frontend/public/guider.map.json")

oai = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo[os.environ["DB_NAME"]]

app = FastAPI(title="Guider site backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------- map cache --------------------------------------- #
_map_cache: Optional[dict] = None


def load_map() -> dict:
    global _map_cache
    if _map_cache is not None:
        return _map_cache
    p = Path(MAP_PATH)
    if p.exists():
        try:
            _map_cache = json.loads(p.read_text())
            return _map_cache
        except Exception:
            pass
    _map_cache = {"pages": []}
    return _map_cache


def compact_map(m: dict, current_route: str) -> dict:
    pages = []
    for p in m.get("pages", []):
        is_current = p.get("route") == current_route
        base = {
            "route": p.get("route"),
            "purpose": p.get("purpose"),
            "categories": p.get("categories", []),
        }
        if is_current:
            for k in ("summary", "interactive", "visuals", "modals", "dropdowns", "conditions"):
                if p.get(k) is not None:
                    base[k] = p[k]
        else:
            base["interactiveCount"] = len(p.get("interactive", []))
            base["keyActions"] = [
                (x.get("label") or x.get("purpose") or x.get("tag"))
                for x in (p.get("interactive") or [])[:6]
            ]
        pages.append(base)
    return {"pages": pages}


SYSTEM_PROMPT = """You are Guider, a navigation assistant embedded in a Next.js app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: produce a step-by-step plan that points the user to the exact element(s) they need.

Output ONE JSON object (no prose, no markdown). Shape:
{
  "steps": [
    { "title": "...", "body": "...",
      "selectors": [
        { "kind": "data-guider"|"testid"|"aria"|"role-name"|"text"|"css",
          "value":"...", "role":"...", "name":"...", "tag":"..." }
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
- If unsure: confidence "low" + fallbackMessage. Do not invent UI.
"""


# ----------------------- /api/guider/plan -------------------------------- #
class PlanRequest(BaseModel):
    question: str
    currentRoute: str = "/"
    screenshotDataUrl: str
    mapVersion: Optional[str] = None


def sse(event: str, data) -> bytes:
    payload = data if isinstance(data, str) else json.dumps(data)
    return f"event: {event}\ndata: {payload}\n\n".encode()


@app.post("/api/guider/plan")
async def plan(req: PlanRequest):
    if oai is None:
        raise HTTPException(500, "OpenAI not configured")

    async def gen():
        try:
            site_map = compact_map(load_map(), req.currentRoute)
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"Current route: {req.currentRoute}\n\n"
                                f"User question: {req.question}\n\n"
                                f"Site map (compacted):\n{json.dumps(site_map)}\n\n"
                                "Use the attached screenshot of the user's current viewport."
                            ),
                        },
                        {"type": "image_url", "image_url": {"url": req.screenshotDataUrl}},
                    ],
                },
            ]
            resp = await oai.chat.completions.create(
                model=GUIDER_MODEL,
                response_format={"type": "json_object"},
                messages=messages,
            )
            content = resp.choices[0].message.content or "{}"
            try:
                parsed = json.loads(content)
            except Exception:
                yield sse("error", "parse-failure")
                yield sse("done", {"confidence": "low", "fallbackMessage": "Plan parse failed."})
                return

            for step in parsed.get("steps") or []:
                yield sse("step", step)
                await asyncio.sleep(0.03)
            yield sse(
                "done",
                {
                    "confidence": parsed.get("confidence", "medium"),
                    "fallbackMessage": parsed.get("fallbackMessage"),
                },
            )
        except Exception as e:
            yield sse("error", str(e))

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ----------------------- /api/guider/transcribe -------------------------- #
@app.post("/api/guider/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if oai is None:
        raise HTTPException(500, "OpenAI not configured")
    data = await file.read()
    r = await oai.audio.transcriptions.create(
        model="whisper-1",
        file=(file.filename or "voice.webm", data, file.content_type or "audio/webm"),
    )
    return {"text": getattr(r, "text", "") or ""}


# ----------------------- counter ----------------------------------------- #
@app.get("/api/stats")
async def stats():
    doc = await db.counters.find_one({"_id": "installs"}) or {}
    return {"installs": int(doc.get("count", 4127))}


@app.post("/api/stats/install")
async def bump_install():
    await db.counters.update_one({"_id": "installs"}, {"$inc": {"count": 1}}, upsert=True)
    doc = await db.counters.find_one({"_id": "installs"}) or {}
    return {"installs": int(doc.get("count", 0))}


@app.get("/api/health")
async def health():
    return {"ok": True, "model": GUIDER_MODEL, "mapPages": len(load_map().get("pages", []))}
