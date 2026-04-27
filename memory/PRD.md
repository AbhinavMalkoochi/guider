# Guider — PRD

## Original problem statement
Build `guider` — an AI-powered navigation SDK for Next.js apps. Companies install it via
npm, run a CLI that scans their codebase and produces a semantic site map, and embed a
React widget that lets users ask questions (voice/chat) and get pointed to the exact UI
element via a visual highlight + arrow. Three parts: CLI (`guider init`), Widget
(`<GuiderWidget />`), Agent Mode (scaffold only).

## Architecture

```
/app/packages/guider/
├── package.json          # name: "guider", bin: guider, exports map
├── README.md
├── bin/guider.js         # CLI shebang
├── scripts/build.js      # esbuild → dist/widget.{mjs,cjs}, dist/agent.{mjs,cjs}
├── src/
│   ├── cli/
│   │   ├── index.js      # commander router (init / sync / inject)
│   │   ├── init.js       # scan → enrich → verify → write
│   │   ├── sync.js       # diff codebase vs map, re-enrich changed only
│   │   └── inject.js     # jscodeshift codemod for data-guider attrs
│   ├── scanner/
│   │   ├── scan.js       # Babel AST: routes, interactive/visual elements,
│   │   │                 # conditionals, link graph, component import resolution
│   │   ├── resolve.js    # ./, /, @/ alias resolution
│   │   └── categorize.js # heuristic category tagging (billing/team/...)
│   ├── llm/
│   │   ├── enrich.js     # OpenAI client wrapper with strict JSON schema
│   │   └── prompts.js    # ENRICH_SYSTEM_PROMPT + payload builder
│   ├── verify/tui.js     # prompts-based terminal review UI
│   ├── widget/
│   │   ├── GuiderWidget.jsx  # main React component (chat + voice + steps)
│   │   ├── llm.js        # browser → OpenAI vision (chat completions w/ image)
│   │   ├── voice.js      # MediaRecorder + Whisper-1
│   │   ├── screenshot.js # lazy-imported html2canvas (fresh JPEG every query)
│   │   ├── selectors.js  # ranked selector resolution + visibility check
│   │   ├── highlight.js  # 4-piece dim mask + glowing ring + arrow + tooltip
│   │   ├── context.js    # GuiderProvider / useGuider hooks
│   │   └── index.js      # public exports
│   └── agent/index.js    # scaffold (throws "not implemented")
└── examples/sample-next-app/  # tiny fixture for scanner testing
```

**Tech stack**: Node 18+ CLI (ESM), React 17+ peer dep, esbuild, OpenAI Node SDK, html2canvas, jscodeshift, @babel/parser, prompts, commander, ora, chalk.

**Model**: `gpt-5-nano-2025-08-07` (configurable per-call) for both CLI enrichment and widget vision plans. Whisper-1 for voice.

## What's been implemented (2026-01-27)

- [x] CLI `guider init` — full scan + LLM enrichment + terminal verification UI
- [x] CLI `guider sync` — diffs codebase against map, re-enriches only changed pages (hash strips LLM-added fields so static-only edits are detected correctly)
- [x] CLI `guider inject` — idempotent codemod injecting `data-guider="..."` IDs onto links, buttons, *Trigger components, tabs, forms
- [x] Scanner — pages/ + app/ router discovery, AST extraction (interactive + visual + conditional renders), local component resolution (3 levels deep), inbound/outbound link graph
- [x] Auto-tagging: billing, usage, team, permissions, api-keys, integrations, security, notifications, onboarding, settings, analytics
- [x] LLM enrichment with strict JSON schema, confidence levels (high/medium/low), graceful failure
- [x] React widget `<GuiderWidget />` — floating launcher + chat panel
- [x] Voice input via MediaRecorder + OpenAI Whisper, with text fallback
- [x] Fresh viewport screenshot (lazy-loaded html2canvas, never cached)
- [x] OpenAI vision call combining map + screenshot + question
- [x] Ranked selector resolution (data-guider → testid → aria → role+name → text → CSS) with visibility check
- [x] Visual highlight overlay: 4-piece dim mask, pulsing ring, arrow, tooltip with step counter, scroll-into-view
- [x] Selector-fail fallback → visual hint message ("Look for the orange button at the top right…")
- [x] Low-confidence handling: returns dashed warning instead of confident wrong guess
- [x] Sequential multi-step flows with explicit Next/Skip confirmation
- [x] Full overlay cleanup on close / unmount / step completion
- [x] Agent mode scaffold (`/agent` subpath export) with documented hook-in points
- [x] Bundle: 27 KB widget ESM, html2canvas lazy-imported, react/react-dom externalized
- [x] TypeScript declarations (`dist/widget.d.ts`)
- [x] README with architecture, CLI options, widget props, schema, privacy notes

## Verified end-to-end

Run against `examples/sample-next-app`:
- 4 routes scanned (`/`, `/billing`, `/settings/api-keys`, `/team`)
- 3/4 pages came back at `confidence: high` from `gpt-5-nano-2025-08-07`
- Categories detected: analytics, api-keys, billing, permissions, security, settings, team
- Codemod injected 15 `data-guider` attributes across 5 files (idempotent on re-run)
- Sync correctly reports 0 changed when nothing changes; 1 changed when 1 button added

## What's NOT implemented (deliberate)

- **Agent mode** — scaffold only per problem statement; `agentMode.run()` throws.

## Backlog / next tasks (P1)
- Server-side proxy example (so consumers don't ship `apiKey` to the browser)
- Storybook/Playwright tests for the highlight engine across viewport edge cases
- Streaming step plans (server-sent events) for faster first-step paint
- Map signing + integrity check at widget load
- Per-tenant maps for multi-tenant SaaS
- Accessibility pass on the widget (ARIA roles, focus trap inside panel)
- Dropdown / modal "deep mapping" — currently the LLM fills these from inferred data; could be improved with a second-pass scan that parses children of identified DialogContent/PopoverContent components
