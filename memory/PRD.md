# Guider — PRD

## Original problem statement
Build `guider` — an AI-powered navigation SDK for Next.js apps. Companies install it via
npm, run a CLI that scans their codebase and produces a semantic site map, and embed a
React widget that lets users ask questions (voice/chat) and get pointed to the exact UI
element via a visual highlight + arrow. Three parts: CLI (`guider init`), Widget
(`<GuiderWidget />`), Agent Mode.

## Architecture

```
/app
├── packages/guider/                 # the published npm package
│   ├── package.json                 # name: "guider", bin, exports map, peerDeps
│   ├── README.md
│   ├── bin/guider.js
│   ├── scripts/build.js             # esbuild → dist/widget.{mjs,cjs}, dist/agent.{mjs,cjs}
│   ├── src/
│   │   ├── cli/
│   │   │   ├── index.js             # commander router
│   │   │   ├── init.js              # scan → enrich → verify → write
│   │   │   ├── sync.js              # diff + selective re-enrichment
│   │   │   └── inject.js            # jscodeshift codemod
│   │   ├── scanner/
│   │   │   ├── scan.js              # AST extraction, handler tracing, link graph,
│   │   │   │                        #   route groups, dynamic, parallel, alias
│   │   │   ├── resolve.js
│   │   │   └── categorize.js
│   │   ├── llm/
│   │   │   ├── enrich.js
│   │   │   └── prompts.js
│   │   ├── verify/tui.js
│   │   ├── widget/
│   │   │   ├── GuiderWidget.jsx     # focus-trap, Esc, aria-live, agent toggle
│   │   │   ├── llm.js               # planGuidance + streamPlanGuidance (SSE)
│   │   │   ├── voice.js             # MediaRecorder + Whisper
│   │   │   ├── screenshot.js        # lazy html2canvas
│   │   │   ├── selectors.js         # ranked resolver
│   │   │   ├── highlight.js         # a11y overlay, prefers-reduced-motion
│   │   │   └── ...
│   │   └── agent/
│   │       ├── interact.js          # click/type/select/press/wait primitives
│   │       ├── runner.js            # plan executor with progress callbacks
│   │       └── index.js
│   └── examples/
│       ├── sample-next-app/         # complex fixture: app router, route groups,
│       │                            #   dynamic [tab], radix Dialog.Trigger,
│       │                            #   @/ alias, conditional renders, handler
│       │                            #   functions referenced by name
│       └── server-proxy/            # 100-line Node Express SSE+Whisper proxy
│
├── frontend/                        # Landing site (React, port 3000)
│   ├── package.json                 # imports `guider` via `file:../packages/guider`
│   ├── public/guider.map.json       # hand-crafted map for the demo UI
│   └── src/{App.js,App.css,index.{js,css}}
│
├── backend/                         # FastAPI proxy backend (port 8001, all routes /api/*)
│   ├── server.py                    # /api/guider/plan (SSE), /api/guider/transcribe,
│   │                                # /api/stats, /api/health
│   ├── requirements.txt
│   └── .env                         # MONGO_URL, DB_NAME, OPENAI_API_KEY, GUIDER_MODEL
│
└── memory/PRD.md                    # this file
```

**Tech stack**:
- CLI: Node 18+ ESM, Babel parser, jscodeshift, OpenAI Node SDK, prompts, commander, ora, chalk
- Widget: React 17+ peer dep, esbuild, html2canvas (lazy)
- Backend: FastAPI, Motor (Mongo), AsyncOpenAI
- Frontend: CRA-style React, Instrument Serif + IBM Plex Sans/Mono

**Model**: `gpt-5-nano-2025-08-07` end-to-end. Whisper-1 for voice. User's own OpenAI key.

## What's implemented (2026-01-27, iteration 2)

### Scanner (substantial accuracy upgrades)
- [x] App router + Pages router discovery, route groups `(group)`, dynamic `[id]`, catch-all, optional, parallel routes (skipped)
- [x] Type-only imports skipped, barrel re-exports followed
- [x] `@/` TS path alias + relative + absolute resolution
- [x] Component imports resolved up to 4 levels deep
- [x] Concurrent file scans (8-way) + AST cache
- [x] **Handler tracing**: `<Button onClick={handleSave}>` → looks up `handleSave` in scope → reads body → infers `router.push('/x')` / `setIsOpen(true)` / `fetch('/api/y')` / `mutation.mutate()` outcomes in user-facing language
- [x] `Dialog.Trigger`-style JSXMemberExpression preserved
- [x] Route group `(marketing)/page.tsx` → `/`; dynamic `[tab]/page.tsx` → `/billing/:tab`
- [x] Inbound link graph resolves dynamic routes
- [x] Conditional renders (logical `&&`, ternary) with optional-chaining-aware describeCondition

### CLI
- [x] `guider init` — full pipeline with terminal verification UI (prompts), confidence colored
- [x] `guider sync` — hash strips LLM fields so static-only edits trigger re-enrichment correctly
- [x] `guider inject` — idempotent codemod (verified)
- [x] Clean process exit (avoids OpenAI keepalive socket hang)

### Widget
- [x] React 17+ component, 47 KB ESM bundle, `html2canvas` lazy-loaded
- [x] Voice via Whisper (proxy or direct)
- [x] Fresh screenshot per query, never cached
- [x] **SSE streaming** — first highlight appears as soon as step 0 arrives
- [x] Selector resolver with visibility check, falls back through 6 strategies
- [x] Highlight engine: 4-piece dim mask + glowing pulsing ring + arrow + tooltip
- [x] **Accessibility pass**:
  - `role=dialog`, focus-trap (Tab/Shift-Tab cycles within panel), Escape closes
  - `aria-live` log + dedicated screen-reader live region
  - `aria-pressed` on toggles, `aria-expanded`/`aria-controls` on launcher
  - `prefers-reduced-motion`: no pulse, instant scroll
  - `prefers-contrast: more`: black/white tooltip
  - Highlight tooltip is keyboard-accessible (Enter advances, Escape skips, primary action auto-focused)

### Agent Mode (FULL implementation, no longer scaffold)
- [x] `interact.js` primitives:
  - `click()` — full pointer/mouse sequence + native `el.click()` (works with React/Vue/Svelte event delegation)
  - `type()` — prototype-level native value setter (bypasses React's controlled-input cache) + composed input/change events
  - `selectOption()`, `press()`, `waitForSettle()`, `waitForRoute()`
- [x] `runner.js` — sequential plan execution with progress callbacks, abort signal, timeout, route-change waits, MutationObserver settle
- [x] UI toggle in widget (AGENT chip), live trace messages
- [x] Documented `isTrusted` limit (clipboard/fullscreen)

### Server proxy
- [x] `examples/server-proxy/` — 100-line Node Express, SSE plan endpoint, multipart Whisper proxy, CORS, env-driven map path
- [x] FastAPI mirror at `/app/backend/server.py` mounted at `/api/guider/plan` + `/api/guider/transcribe`

### Landing site
- [x] React app at `/app/frontend` (port 3000)
- [x] Sections: Nav, Hero (serif headline + gradient italic emphasis), Quote pull, How (3 cards), Install (tabbed snippets), Demo (interactive Settings/Team/Billing/API-keys app with real Invite-teammate modal), Privacy, FAQ, Footer
- [x] Live `<GuiderWidget />` embedded — uses real backend SSE proxy
- [x] Backend stats counter via Mongo (`/api/stats`, `/api/stats/install`)

## Verified end-to-end

- `guider init` against complex fixture: 6 routes, route groups stripped, dynamic `[tab]`, `@/components/InviteDialog` (radix Dialog.Trigger) resolved through alias
- Handler tracing produces `outcome="navigates to /billing/upgrade"`, `outcome="calls /api/export"`, `outcome="closes a dialog"` correctly
- LLM enrichment via real OpenAI call: 3/4 pages at `confidence: high`, semantic categories assigned
- `guider inject` adds 15+ `data-guider` attrs idempotently
- `guider sync` correctly reports 0 / N changed
- Server proxy SSE endpoint: returns 4-step plan (click → type → select → click) with proper actions for "How do I invite a teammate?"
- Landing page renders end-to-end on port 3000 via supervisor; widget mounts; AGENT toggle works; demo tabs (Overview/Team/Billing/API keys) render correctly
- Lint clean (Python + JS) across all three codebases

## NOT implemented (deferred)

- Auto-replan on agent divergence (currently surfaces error to UI)
- Chrome extension build for trusted-event clicks
- Per-tenant maps for multi-tenant SaaS
- Map signing + integrity check
- Storybook/Playwright tests for highlight engine on edge viewports

## How to run

```bash
# Backend already running via supervisor at :8001
# Frontend already running via supervisor at :3000

# Try the CLI on the fixture
cd /app/packages/guider
OPENAI_API_KEY=... node bin/guider.js init --cwd ./examples/sample-next-app

# Try the standalone Node proxy
cd examples/server-proxy
OPENAI_API_KEY=... GUIDER_MAP=../../examples/sample-next-app/guider.map.json node server.js
```
