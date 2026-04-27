# Guider

> **AI-powered navigation SDK for Next.js apps.** Drop in a CLI + a single React component and your users can ask "where do I update my billing email?" — Guider points them to the exact element to click, with a visible highlight and arrow.

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
      <GuiderWidget
        mapUrl="/guider.map.json"
        apiKey={process.env.NEXT_PUBLIC_OPENAI_KEY}
      />
    </body></html>
  );
}
```

That's it.

---

## How it works

| Stage | What it does |
|---|---|
| **CLI scan** | Discovers every route in `pages/` and `app/`. Parses each entry plus locally-imported components via Babel AST. Extracts every interactive element (buttons, links, modals, forms, dropdowns, tabs), every visual element (tables, charts, cards, badges, empty states), every conditional render (admin-only, plan-gated, etc.), and the full inbound/outbound link graph. |
| **LLM enrichment** | Sends the extracted JSON for each page to OpenAI with a strict schema. The LLM returns user-facing purpose, summary, semantic categories (`billing`, `team`, `permissions`, `api-keys`, `integrations`, `security`, `notifications`, `onboarding`, `settings`, `analytics`), per-element `purpose` + `outcome`, and modal/dropdown deep-mapping. Static + LLM together — neither alone is sufficient. |
| **Verification UI** | Terminal walks you through every page: accept, edit, or skip. Confidence is colored. Nothing publishes until you confirm. |
| **Codemod** | `guider inject` adds stable `data-guider="…"` IDs onto nav items, modal triggers, settings sections, primary CTAs, tabs, and dropdowns so the widget can find them reliably. |
| **Sync** | `guider sync` diffs your codebase against the existing map and re-enriches only what changed. Map stays fresh on every redeploy. |
| **Widget — query time** | User asks (typed or via Whisper voice). The widget snaps a fresh JPEG of the current viewport, sends it + the map + the question to OpenAI vision. |
| **Plan & highlight** | LLM returns step-by-step instructions with ranked selector candidates per step (data-guider → testid → aria → role+name → text → CSS) plus a visual hint. The widget finds the element, scrolls it into view, dims the rest of the page, and draws a glowing ring + arrow + tooltip. Step-by-step, confirmed. |
| **Selector fallback** | If selectors miss, the widget switches to the visual hint and tells the user verbatim how to find the element on screen. Never silent failure. |
| **Agent mode** | Scaffold only — a future release will execute the steps automatically. The hook-in points are in `src/agent/index.js`. |

---

## CLI

```
guider init     [--cwd .] [--out guider.map.json] [--no-llm] [--no-verify] [--dry-run]
                [--api-key KEY] [--model gpt-5-nano-2025-08-07]

guider sync     [--cwd .] [--map guider.map.json] [--no-llm]
                [--api-key KEY] [--model gpt-5-nano-2025-08-07]

guider inject   [--cwd .] [--dry-run]
```

Set `OPENAI_API_KEY` in your shell or pass `--api-key`. Without a key, the scanner still emits a static-only map (no semantic enrichment).

### Map schema (excerpt)

```json
{
  "version": "0.1",
  "generatedAt": "...",
  "pages": [
    {
      "route": "/team",
      "file": "pages/team.jsx",
      "purpose": "Manage who's on your team and what they can access.",
      "summary": "Lists members, lets admins invite, change roles, or remove. Shows seat usage.",
      "categories": ["team", "permissions"],
      "interactive": [
        { "label": "Invite member", "type": "link", "purpose": "Open the invite flow",
          "outcome": "Goes to /team/invite", "visibleWhen": null }
      ],
      "visuals": [
        { "kind": "table", "label": "Team members table",
          "describes": "Rows of teammates with name, role, last active, and actions" }
      ],
      "modals":   [{ "trigger": "Manage seats", "purpose": "...", "actions": ["Add seat", "Remove seat"] }],
      "dropdowns":[{ "trigger": "Role", "items": ["Admin", "Editor", "Viewer"] }],
      "conditions":[{ "tag": "button", "condition": "subscription.plan === \"pro\"" }],
      "linkedFrom": ["/", "/dashboard"],
      "links": ["/team/invite", "/billing"],
      "confidence": "high"
    }
  ]
}
```

---

## Widget props

| Prop | Required | Description |
|---|---|---|
| `apiKey` | yes | OpenAI API key. For production, prefer routing through your own proxy. |
| `mapUrl` _or_ `map` | yes | URL to fetch `guider.map.json`, or the parsed object. |
| `model` | – | Defaults to `gpt-5-nano-2025-08-07`. |
| `endpoint` | – | Override OpenAI chat completions URL (use a proxy). |
| `whisperEndpoint` | – | Override Whisper URL (use a proxy). |
| `currentRoute` | – | Override route detection. Defaults to `window.location.pathname`. |
| `position` | – | `'bottom-right'` (default) or `'bottom-left'`. |
| `accent` | – | Hex color. Default `#f5d042`. |
| `onAgentMode` | – | Future: agent-mode toggle callback. |

---

## Privacy & security

- Screenshots are captured fresh at query time and sent **only** to the OpenAI endpoint you configure. They are never cached or persisted by the widget.
- The map is served from your own origin (e.g., `/guider.map.json`) and can be cached aggressively — it only changes on redeploy.
- The widget bundle is ~27 KB minified ESM. `html2canvas` (~50 KB gzipped) is **lazy-imported** the first time a question is asked.
- All highlight overlays are removed on widget close, step completion, or unmount — guaranteed.
- For production, route widget calls through a server proxy so `apiKey` never reaches the browser.

---

## Roadmap

- Agent mode (auto-execute steps)
- WebSocket streaming of step plans
- Per-tenant maps for multi-tenant SaaS
- Map signing + integrity check at load time
