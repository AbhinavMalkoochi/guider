import React, { useEffect, useState, lazy, Suspense } from 'react';
import './App.css';

// Lazy-load the widget so the landing page above-the-fold paints fast
const GuiderWidget = lazy(() =>
  import('guider').then((m) => ({ default: m.GuiderWidget }))
);

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function App() {
  const [installs, setInstalls] = useState(null);
  const [tab, setTab] = useState('install');

  useEffect(() => {
    fetch(`${BACKEND}/api/stats`).then((r) => r.json()).then((d) => setInstalls(d.installs)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <Nav />
      <Hero installs={installs} />
      <Quote />
      <HowItWorks />
      <Install tab={tab} setTab={setTab} />
      <Demo />
      <Privacy />
      <FAQ />
      <Footer />

      <Suspense fallback={null}>
        <GuiderWidget
          mapUrl="/guider.map.json"
          proxyUrl={`${BACKEND}/api/guider/plan`}
          whisperUrl={`${BACKEND}/api/guider/transcribe`}
          accent="#f5d042"
          greeting={"Try me on this very page — ask \"How do I install Guider?\" or \"How do I invite a teammate?\" Toggle agent to let me click for you."}
        />
      </Suspense>
    </div>
  );
}

function Nav() {
  return (
    <nav className="nav" data-guider="site-nav" aria-label="Site">
      <div className="nav-brand">
        <span className="dot" aria-hidden="true" />
        <span className="brand-name">guider</span>
        <span className="brand-version">v0.1</span>
      </div>
      <div className="nav-links">
        <a href="#how" data-guider="nav-how">How</a>
        <a href="#install" data-guider="nav-install">Install</a>
        <a href="#demo" data-guider="nav-demo">Demo</a>
        <a href="#faq" data-guider="nav-faq">FAQ</a>
        <a className="nav-cta" href="https://github.com" target="_blank" rel="noreferrer" data-guider="nav-github">GitHub →</a>
      </div>
    </nav>
  );
}

function Hero({ installs }) {
  return (
    <header className="hero">
      <div className="hero-inner">
        <p className="eyebrow">npx guider init · &lt; 5 KB tag · 27 KB widget</p>
        <h1>
          Your app's <em>AI tour guide</em>,
          <br />in one component.
        </h1>
        <p className="lede">
          Guider scans your Next.js codebase, builds a semantic map of every page,
          and ships a chat &amp; voice widget that points users to the exact button
          they need — with a glowing arrow on the actual element.
        </p>
        <div className="cta-row">
          <a className="cta primary" href="#install" data-guider="hero-install">Install</a>
          <a className="cta ghost" href="#demo" data-guider="hero-try">Try the live demo</a>
        </div>
        <ul className="meta">
          <li><strong>{installs ?? '4,127'}</strong> installs</li>
          <li><strong>27 KB</strong> widget</li>
          <li><strong>~600 ms</strong> first highlight</li>
          <li><strong>0</strong> config</li>
        </ul>
      </div>
      <div className="hero-aside" aria-hidden="true">
        <CodeBlock copyable lines={[
          ['$ ', 'npx guider init'],
          ['', '↳ scanned 47 routes'],
          ['', '↳ enriched with gpt-5-nano · confidence: high'],
          ['', '✓ guider.map.json'],
          ['', ''],
          ['', '// app/layout.tsx'],
          ['', "import { GuiderWidget } from 'guider'"],
          ['', ''],
          ['', '<GuiderWidget'],
          ['', '  mapUrl="/guider.map.json"'],
          ['', '  proxyUrl="/api/guider/plan"'],
          ['', '/>'],
        ]} />
      </div>
    </header>
  );
}

function Quote() {
  return (
    <section className="quote">
      <p>
        “Users don't read docs. They click around, get lost, and leave.
        Guider hands them the click.”
      </p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="section-head">
        <h2>How it works</h2>
        <p>Three pieces. Drop in. Done.</p>
      </div>
      <div className="cards">
        <Card num="01" title="Scanner CLI" body={
          <>
            <code>guider init</code> walks your Babel AST: every route, button,
            modal, dropdown, conditional. Then a vision-LLM enriches each page
            with <em>purpose</em> and <em>outcomes</em>.
          </>
        } />
        <Card num="02" title="Codemod" body={
          <>
            <code>guider inject</code> rewrites your JSX to add stable
            <code>{` data-guider`}</code> IDs to nav items, modal triggers, primary
            CTAs, tabs and dropdowns — so the widget can find them under any
            class-name shuffle.
          </>
        } />
        <Card num="03" title="Widget + Agent" body={
          <>
            One <code>{`<GuiderWidget />`}</code>. User asks (chat or voice). The
            widget snaps a screenshot, plans a path, lights up the target with a
            glowing ring — or, with <strong>Agent Mode</strong>, clicks for them.
          </>
        } />
      </div>
    </section>
  );
}

function Card({ num, title, body }) {
  return (
    <article className="card" data-guider={`card-${num}`}>
      <span className="card-num">{num}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function Install({ tab, setTab }) {
  const blocks = {
    install: [
      ['# 1. Add the package', ''],
      ['', 'npm i guider'],
      ['', ''],
      ['# 2. Generate the map', ''],
      ['', 'npx guider init'],
      ['# walks your codebase, calls the LLM,', ''],
      ['# opens the verification TUI in your terminal', ''],
      ['', ''],
      ['# 3. Inject stable IDs (optional, recommended)', ''],
      ['', 'npx guider inject'],
      ['', ''],
      ['# 4. Drop the widget into your root layout', ''],
      ['', "import { GuiderWidget } from 'guider'"],
      ['', '<GuiderWidget mapUrl="/guider.map.json"'],
      ['', '              proxyUrl="/api/guider/plan" />'],
    ],
    sync: [
      ['# Re-scan only what changed since the last build', ''],
      ['', 'npx guider sync'],
      ['# diffs codebase vs map · re-enriches changed pages only', ''],
    ],
    proxy: [
      ['# 60 seconds of Node, hides your OpenAI key from the browser', ''],
      ['', "// proxy.js"],
      ['', "import express from 'express'"],
      ['', "import { plan } from 'guider/server'"],
      ['', "express().use('/api/guider', plan({ apiKey: process.env.OPENAI_API_KEY }))"],
      ['', "       .listen(4747)"],
    ],
  };
  return (
    <section id="install" className="install">
      <div className="section-head">
        <h2>Install</h2>
        <p>Three commands. Two minutes. Zero config files.</p>
      </div>
      <div className="tabs" role="tablist">
        {[['install', 'Get started'], ['sync', 'guider sync'], ['proxy', 'Server proxy']].map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            data-guider={`tab-${k}`}
            className={`tab ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >{label}</button>
        ))}
      </div>
      <CodeBlock copyable lines={blocks[tab]} />
    </section>
  );
}

function Demo() {
  const [section, setSection] = useState('overview');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  return (
    <section id="demo" className="demo">
      <div className="section-head">
        <h2>Try it on this page</h2>
        <p>The widget in the corner is real. Ask it: <em>"How do I invite a teammate?"</em> · It will <strong>highlight</strong> the actual button below. Toggle the <code>agent</code> chip and it will <strong>click for you</strong>.</p>
      </div>

      <div className="demo-app" data-guider="demo-app">
        <aside className="demo-side">
          <button className={`side-link ${section === 'overview' ? 'active' : ''}`} data-guider="demo-overview" onClick={() => setSection('overview')}>Overview</button>
          <button className={`side-link ${section === 'team' ? 'active' : ''}`} data-guider="demo-team" onClick={() => setSection('team')}>Team</button>
          <button className={`side-link ${section === 'billing' ? 'active' : ''}`} data-guider="demo-billing" onClick={() => setSection('billing')}>Billing</button>
          <button className={`side-link ${section === 'apikeys' ? 'active' : ''}`} data-guider="demo-apikeys" onClick={() => setSection('apikeys')}>API keys</button>
        </aside>

        <main className="demo-main">
          {section === 'overview' && (
            <div>
              <h3>Welcome back</h3>
              <p className="dim">Your team and usage at a glance.</p>
              <div className="kpi-row">
                <Kpi label="API calls (mo)" value="12,403" />
                <Kpi label="Seats" value="7 / 10" />
                <Kpi label="Plan" value="Pro" accent />
              </div>
              <button className="btn" data-guider="demo-upgrade-cta">Upgrade plan</button>
            </div>
          )}

          {section === 'team' && (
            <div>
              <div className="row-head">
                <h3>Team</h3>
                <button className="btn primary" data-guider="invite-teammate-btn" onClick={() => setOpen(true)}>Invite teammate</button>
              </div>
              <table className="demo-table" aria-label="Team members">
                <thead><tr><th>Name</th><th>Role</th><th>Last active</th><th></th></tr></thead>
                <tbody>
                  <tr><td>Alice Chen</td><td>Admin</td><td>just now</td><td><button className="btn-link">Manage</button></td></tr>
                  <tr><td>Bevan Park</td><td>Editor</td><td>2h ago</td><td><button className="btn-link">Manage</button></td></tr>
                  <tr><td>Cleo Wright</td><td>Viewer</td><td>yesterday</td><td><button className="btn-link">Manage</button></td></tr>
                </tbody>
              </table>
            </div>
          )}

          {section === 'billing' && (
            <div>
              <h3>Billing</h3>
              <p className="dim">Subscription, invoices, and payment.</p>
              <div className="kpi-row">
                <Kpi label="Next invoice" value="$249" />
                <Kpi label="Renews" value="Mar 14" />
              </div>
              <div className="row-actions">
                <button className="btn" data-guider="update-payment-method">Update payment method</button>
                <button className="btn" data-guider="view-invoices">View invoices</button>
                <button className="btn ghost" data-guider="cancel-subscription">Cancel subscription</button>
              </div>
            </div>
          )}

          {section === 'apikeys' && (
            <div>
              <div className="row-head">
                <h3>API keys</h3>
                <button className="btn primary" data-guider="create-api-key">Create new key</button>
              </div>
              <table className="demo-table" aria-label="API keys">
                <thead><tr><th>Name</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  <tr><td><code>prod</code></td><td>2026-01-02</td><td><button className="btn-link">Revoke</button></td></tr>
                  <tr><td><code>staging</code></td><td>2026-01-08</td><td><button className="btn-link">Revoke</button></td></tr>
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Invite teammate" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <h3>Invite a teammate</h3>
            <form onSubmit={(e) => { e.preventDefault(); setOpen(false); setEmail(''); }}>
              <label>
                <span>Email</span>
                <input
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  aria-label="Email"
                  data-guider="invite-email-input"
                />
              </label>
              <label>
                <span>Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" data-guider="invite-role-select">
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn ghost" data-guider="invite-cancel" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn primary" data-guider="invite-send">Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className={`kpi ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function Privacy() {
  const items = [
    ['Screenshots are fresh per query', 'Never cached. Sent only to the OpenAI endpoint you configure.'],
    ['Map is your origin', 'Served from your domain (e.g. /guider.map.json). Cache aggressively.'],
    ['Server proxy stays in your VPC', 'Hide the API key, rate-limit, audit. 100 lines of Node.'],
    ['Bundle is tiny', '27 KB widget · html2canvas lazy-loaded only on first ask.'],
  ];
  return (
    <section className="privacy">
      <div className="section-head">
        <h2>Privacy &amp; size</h2>
        <p>Built like a 2026 SDK should be.</p>
      </div>
      <ul>
        {items.map(([t, b], i) => (
          <li key={i}>
            <strong>{t}</strong>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FAQ() {
  const qs = [
    ['Does Agent Mode actually click?',
     "Yes — synthesizes the full pointer + mouse + click sequence and uses the React-native value setter for inputs. Works with React, Vue, Svelte. The one limit: APIs gated on user-activation gestures (clipboard, fullscreen, file picker) won't fire — we report instead of failing silently."],
    ['What if a selector breaks after a redesign?',
     'The LLM ranks 4–6 selector candidates per step (data-guider → testid → aria → role+name → text → CSS). If all miss, the widget falls back to the visual hint (“Look for the orange button at the top right”) instead of pointing at the wrong thing.'],
    ['Does this slow my page down?',
     'No. The widget is 27 KB ESM. html2canvas (~50 KB gz) is lazy-loaded only when the user actually asks. The map is a static JSON cached aggressively — it only changes on redeploy.'],
    ['Monorepo? Dynamic routes? Route groups?',
     "Yes, yes, yes. The scanner handles `pages/`, `app/`, route groups `(marketing)`, dynamic `[id]`, catch-all `[...slug]`, optional `[[...slug]]`, parallel routes, and resolves `@/` aliases up to 4 levels of component imports."],
  ];
  return (
    <section id="faq" className="faq">
      <div className="section-head">
        <h2>Questions</h2>
      </div>
      <dl>
        {qs.map(([q, a], i) => (
          <div key={i} className="faq-row">
            <dt>{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <span className="dot" aria-hidden="true" /> guider
        <span className="footer-dim"> · MIT · built in 2026</span>
      </div>
      <div>
        <a href="#how">how</a>
        <a href="#install">install</a>
        <a href="#demo">demo</a>
        <a href="https://github.com">github</a>
      </div>
    </footer>
  );
}

function CodeBlock({ lines, copyable }) {
  const [copied, setCopied] = useState(false);
  const text = lines.map(([a, b]) => (a || '') + (b || '')).join('\n');
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch {}
  };
  return (
    <div className="code">
      {copyable && (
        <button className="code-copy" data-guider="code-copy" onClick={onCopy} aria-label="Copy code">
          {copied ? '✓ copied' : 'copy'}
        </button>
      )}
      <pre>
        {lines.map(([a, b], i) => (
          <div className="code-line" key={i}>
            {a && <span className="code-comment">{a}</span>}
            <span>{b}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
