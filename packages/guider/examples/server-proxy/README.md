# Guider — Server Proxy

A 100-line Node server that hides your OpenAI key from the browser, streams
step plans via SSE, and proxies Whisper for voice.

```bash
cd examples/server-proxy
npm install
OPENAI_API_KEY=sk-... GUIDER_MAP=../../guider.map.json node server.js
# → http://localhost:4747
```

In your app:

```jsx
<GuiderWidget
  mapUrl="/guider.map.json"
  proxyUrl="https://your-api.example.com/guider/plan"
  whisperUrl="https://your-api.example.com/guider/transcribe"
/>
```

That's it — no `apiKey` prop needed. Stick this behind your existing auth /
rate limiter and you're production-ready. The proxy uses SSE so the first
step appears in <1s while the rest stream in.

Environment:

| var | default | meaning |
|---|---|---|
| `OPENAI_API_KEY` | – | required |
| `GUIDER_MODEL` | `gpt-5-nano-2025-08-07` | OpenAI model |
| `GUIDER_MAP` | `./guider.map.json` | path to your generated map |
| `GUIDER_ALLOWED_ORIGIN` | `*` | CORS origin |
| `PORT` | `4747` |  |
