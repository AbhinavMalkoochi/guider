import React, { Suspense, lazy, useEffect, useState } from 'react';
import './App.css';

const GuiderWidget = lazy(() =>
  import('guider').then((module) => ({ default: module.GuiderWidget }))
);

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function App() {
  const [installs, setInstalls] = useState(null);

  useEffect(() => {
    if (!BACKEND) return;

    let cancelled = false;
    fetch(`${BACKEND}/api/stats`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.installs) {
          setInstalls(data.installs);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <Nav />
      <main className="main">
        <Hero installs={installs} />
        <Overview />
        <Install />
        <DemoSurface />
      </main>
      <Footer />

      <Suspense fallback={null}>
        <GuiderWidget
          mapUrl="/guider.map.json"
          proxyUrl={BACKEND ? `${BACKEND}/api/guider/plan` : undefined}
          whisperUrl={BACKEND ? `${BACKEND}/api/guider/transcribe` : undefined}
          accent="#111111"
          greeting={'Ask where something lives. Guider will point to it or click through the flow.'}
        />
      </Suspense>
    </div>
  );
}

function Nav() {
  return (
    <header className="nav">
      <a href="#top" className="brand" data-guider="brand">
        guider
      </a>
      <nav className="nav-links" aria-label="Primary">
        <a href="#overview" data-guider="nav-overview">Product</a>
        <a href="#install" data-guider="nav-install">Install</a>
        <a href="#demo" data-guider="nav-demo">Demo</a>
      </nav>
    </header>
  );
}

function Hero({ installs }) {
  return (
    <section id="top" className="hero">
      <div className="hero-copy">
        <p className="eyebrow">minimal guidance for complex products</p>
        <h1>A guide that stays out of the way until the user needs the next click.</h1>
        <p className="lede">
          Run one CLI, generate a semantic map of your product, and ship one tiny widget.
          Guider answers with direction, highlight, voice, or action instead of a full chat panel.
        </p>
        <div className="hero-actions">
          <a href="#install" className="button button-dark" data-guider="hero-install">Install</a>
          <a href="#demo" className="button button-light" data-guider="hero-demo">See the flow</a>
        </div>
        <div className="hero-meta">
          <span>{installs || '4,127'} installs</span>
          <span>cursor-first UI</span>
          <span>voice + chat + agent</span>
        </div>
      </div>

      <div className="hero-card" aria-hidden="true">
        <div className="hero-card-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="hero-card-body">
          <div className="command-line">$ npx guider init</div>
          <div className="command-output">scanned routes</div>
          <div className="command-output">ranked selectors</div>
          <div className="command-output">wrote guider.map.json</div>
          <div className="command-output success">widget ready</div>
        </div>
      </div>
    </section>
  );
}

function Overview() {
  return (
    <section id="overview" className="section">
      <div className="section-heading">
        <p className="eyebrow">what ships</p>
        <h2>Three pieces. One quiet surface.</h2>
      </div>

      <div className="grid grid-three">
        <article className="panel" data-guider="scanner-panel">
          <span className="panel-index">01</span>
          <h3>Scanner</h3>
          <p>Walks routes, forms, triggers, tabs, modals, and nested flows to build a map your runtime can use.</p>
        </article>
        <article className="panel" data-guider="inject-panel">
          <span className="panel-index">02</span>
          <h3>Inject</h3>
          <p>Adds durable guider IDs where raw selectors would drift after refactors or visual redesigns.</p>
        </article>
        <article className="panel" data-guider="widget-panel">
          <span className="panel-index">03</span>
          <h3>Widget</h3>
          <p>A compact composer and pointer that can answer, highlight, speak, or execute the path in agent mode.</p>
        </article>
      </div>
    </section>
  );
}

function Install() {
  return (
    <section id="install" className="section install">
      <div className="section-heading">
        <p className="eyebrow">setup</p>
        <h2>Install in minutes.</h2>
      </div>

      <div className="grid install-grid">
        <div className="panel panel-large">
          <pre className="code" data-guider="install-code">
{`npm i guider\nnpx guider init\nnpx guider inject\n\nimport { GuiderWidget } from 'guider'\n\n<GuiderWidget\n  mapUrl="/guider.map.json"\n  proxyUrl="/api/guider/plan"\n/>`}
          </pre>
        </div>
        <div className="panel note-panel">
          <p className="note-label">production</p>
          <p>Serve the map from your app. Keep OpenAI calls behind your own proxy. Let the browser stay thin.</p>
          <p className="note-label">runtime</p>
          <p>The widget asks, plans, highlights, and optionally executes the path without taking over the page.</p>
        </div>
      </div>
    </section>
  );
}

function DemoSurface() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <section id="demo" className="section demo">
      <div className="section-heading">
        <p className="eyebrow">demo</p>
        <h2>Ask the widget on this page.</h2>
      </div>

      <div className="demo-shell" data-guider="demo-shell">
        <aside className="demo-sidebar">
          <button className="demo-link" data-guider="demo-dashboard">Dashboard</button>
          <button className="demo-link active" data-guider="demo-team">Team</button>
          <button className="demo-link" data-guider="demo-billing">Billing</button>
          <button className="demo-link" data-guider="demo-api-keys">API keys</button>
        </aside>

        <div className="demo-main">
          <div className="demo-row">
            <div>
              <h3>Team</h3>
              <p>Try: “invite a teammate” or “where are API keys?”</p>
            </div>
            <button
              className="button button-dark"
              data-guider="invite-teammate-btn"
              onClick={() => setInviteOpen(true)}
            >
              Invite teammate
            </button>
          </div>

          <div className="mini-table">
            <div className="mini-row">
              <span>Alex Morgan</span>
              <span>Admin</span>
              <span>Now</span>
            </div>
            <div className="mini-row">
              <span>Jordan Lee</span>
              <span>Editor</span>
              <span>2h</span>
            </div>
            <div className="mini-row">
              <span>Sam Patel</span>
              <span>Viewer</span>
              <span>1d</span>
            </div>
          </div>
        </div>
      </div>

      {inviteOpen && (
        <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && setInviteOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Invite teammate">
            <h3>Invite teammate</h3>
            <label>
              <span>Email</span>
              <input data-guider="invite-email-input" type="email" placeholder="name@company.com" />
            </label>
            <label>
              <span>Role</span>
              <select data-guider="invite-role-select" defaultValue="editor">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="button button-light" data-guider="invite-cancel" onClick={() => setInviteOpen(false)}>Cancel</button>
              <button className="button button-dark" data-guider="invite-send" onClick={() => setInviteOpen(false)}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>Guider</span>
      <span>minimal guidance for production apps</span>
    </footer>
  );
}
