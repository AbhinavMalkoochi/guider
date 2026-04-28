# Guider

> **AI-powered navigation SDK for Next.js apps.** Drop in a CLI + a single React component and your users can ask "where do I update my payment method?" — Guider listens, auto-stops on pause, and points them to the exact UI target with a live guided cursor. Optional Agent Mode can still act on a step plan for automation scenarios.

```bash
npx guider init                                # scan codebase → guider.map.json
npx guider inject                              # codemod data-guider="..." onto key elements
```

```jsx
// app/layout.tsx (or pages/_app.tsx)
import { GuiderWidget } from 'guider';

export default function RootLayout({ children }) {
  return (
    <html><body>
      {children}
      <GuiderWidget mapUrl="/guider.map.json" proxyUrl="/api/guider/plan" />
    </body></html>
  );
}
```

That's it.

---

## What ships

| | |
|---|---|
| **CLI** (`init` / `sync` / `inject`) | Babel-AST scanner + LLM enrichment + terminal verification |
| **Widget** (`<GuiderWidget />`) | Typed React widget with voice + chat, viewport capture, ranked selector validation, live guided cursor, strict fallback behavior |
| **Agent Mode** | DOM-level click/type/select/keyboard with React-native-value-setter for controlled inputs, MutationObserver settle detection, route-change waits |
| **Server proxy** | TypeScript Express proxy that hides your OpenAI key, streams grounded pointer responses via SSE, proxies transcription |

---

## How the scanner works

| Stage | What it does |
|---|---|
| **Discovery** | Finds every route in `pages/`, `src/pages/`, `app/`, `src/app/`. Handles route groups `(group)`, dynamic `[id]`, catch-all `[...slug]`, optional `[[...slug]]`, parallel routes (skipped). |
| **AST extraction** | Babel-parses each entry + locally-imported components (4 levels deep, type-only imports skipped, barrel re-exports followed). Extracts every interactive element (button, link, form, dropdown, modal/dialog/sheet/popover/menu Triggers, tab, input, switch), every visual element (table, chart, card, badge, counter, empty-state, image), every conditional render. |
| **Handler tracing** | When `<Button onClick={handleSave}>` references a local function, looks it up and reads its body to infer the user-facing outcome — `router.push('/x')` → "navigates to /x"; `setIsOpen(true)` → "opens a dialog"; `fetch('/api/y')` → "calls /api/y"; `mutation.mutate()` → "submits a server action". |
| **Categorization** | Auto-tags pages with semantic categories: `billing`, `usage`, `team`, `permissions`, `api-keys`, `integrations`, `security`, `notifications`, `onboarding`, `settings`, `analytics`. |
| **Link graph** | Builds inbound + outbound link graph (resolves dynamic routes, strips query/hash). |
| **LLM enrichment** | Sends each page's extracted JSON to OpenAI with a strict schema. The LLM returns user-facing `purpose`, `summary`, per-element `outcome`, modal/dropdown deep-mapping, `confidence` (high/medium/low). |
| **Verification TUI** | Walks every page in your terminal: accept, edit, skip, or quit-and-accept-rest. Confidence is colored. Nothing publishes until you confirm. |

`guider sync` diffs the codebase against the existing map (hashing only static fields so LLM enrichments aren't lost) and re-enriches only changed pages.

`guider inject` is an idempotent jscodeshift codemod that adds stable `data-guider="…"` IDs to nav items, modal/sheet/popover/dialog triggers, primary CTAs, tabs, forms — so the widget can find them under any class-name shuffle.

---

## How the widget works

1. The user asks a question by typing or pressing Shift+Cmd/Ctrl+K for voice.
2. Voice capture starts immediately, auto-stops on silence, and suppresses empty or low-signal recordings before they ever reach the model.
3. The widget captures the exact current viewport, sends the question plus screenshot and map context to your proxy, and speaks back immediately instead of waiting in silence.
4. The proxy returns one grounded target, not a multi-step card flow.
5. The widget resolves ranked selector candidates in the live DOM, scores visible matches, rejects occluded or stale hits, and draws a single guided cursor from the user's current pointer to the verified target.
6. If the map or current screen cannot support the answer, Guider says so plainly instead of inventing UI.

### Agent Mode

Toggle the **agent** chip in the panel and the widget *executes* the plan instead of asking the user to click each step.

How it interacts with the DOM:

- **Click** — full pointer + mouse sequence (`pointerover` → `mouseover` → `pointerdown` → `mousedown` → focus → `pointerup` → `mouseup` → native `el.click()`). Most React/Vue/Svelte handlers fire because root-level event delegation listens for bubbled native events.
- **Type** — calls the prototype's value setter directly to bypass React's controlled-input cache, then dispatches `input` (with `composed: true`) and `change`.
- **Select** — same native-value-setter trick on `<select>`.
- **Press** — full `keydown` / `keypress` / `keyup` sequence.
- **Wait** — `MutationObserver`-based DOM-quiescence + route change watcher. Each step waits for the page to settle before moving on.

**Limit**: dispatched events have `isTrusted: false`. APIs gated on user-activation (clipboard write, fullscreen, file picker) won't fire. The agent reports this instead of failing silently.

---

## CLI reference

```
guider init     [--cwd .] [--out guider.map.json] [--no-llm] [--no-verify] [--dry-run]
                [--api-key KEY] [--model gpt-5-nano-2025-08-07]

guider sync     [--cwd .] [--map guider.map.json] [--no-llm]
                [--api-key KEY] [--model gpt-5-nano-2025-08-07]

guider inject   [--cwd .] [--dry-run]
```

Set `OPENAI_API_KEY` in your shell or pass `--api-key`. Without a key, the scanner emits a static-only map (no LLM enrichment).

---

## Widget props

| Prop | Required | Description |
|---|---|---|
| `mapUrl` _or_ `map` | yes | URL to fetch your generated map, or the parsed object. |
| `proxyUrl` | one of | Path/URL to your server proxy plan endpoint (SSE). Recommended for production. |
| `apiKey` | one of | OpenAI API key for direct calls (dev only). |
| `whisperUrl` | – | Path/URL to your Whisper proxy. If unset, voice calls OpenAI directly with `apiKey`. |
| `model` | – | OpenAI model. Default `gpt-5-nano-2025-08-07`. |
| `endpoint` | – | Override OpenAI chat completions URL. |
| `currentRoute` | – | Defaults to `window.location.pathname`. |
| `position` | – | `'bottom-right'` (default) or `'bottom-left'`. |
| `accent` | – | Hex color. Default `#f5d042`. |
| `agent` | – | Show the Agent Mode toggle. Default `true`. |
| `greeting` | – | Empty-state copy in the panel. |

---

## Privacy, size, accessibility

- **Bundle**: 47 KB widget (ESM, gzipped less). `html2canvas` (~50 KB gz) is **lazy-imported** the first time a question is asked. React/ReactDOM are peer deps.
- **Screenshots** are captured fresh per query and sent only to the endpoint you configure. Never cached, never persisted by the widget.
- **Server proxy** ([`examples/server-proxy/`](./examples/server-proxy/)) keeps your API key out of the browser, streams grounded pointer responses via SSE, and proxies transcription.
- **Map** is served from your origin (`/guider.map.json`). Cache aggressively — it only changes on redeploy.
- **Cleanup** is guaranteed on widget close, step completion, and unmount — every overlay, every listener, the global keydown handler.
- **Accessibility**:
  - Panel is `role=dialog` with focus-trap + Escape-to-close.
  - Live region announces assistant messages and step changes.
  - Highlight tooltip is a focused `role=dialog` with screen-reader-readable step counter, Enter advances, Escape skips.
  - Respects `prefers-reduced-motion` (no pulse, instant scroll) and `prefers-contrast: more` (black/white tooltip).
  - Every interactive element has `aria-label`, `aria-pressed`, `aria-expanded`, `aria-controls` as appropriate.

---

## Roadmap

- Auto-replan on agent divergence (re-screenshot when an unexpected route arrives)
- Per-tenant maps for multi-tenant SaaS
- Map signing + integrity check at widget load
- Chrome extension build for trusted-event clicks (full clipboard/fullscreen support)
