/**
 * Find an element on the page given a list of selector candidates from the LLM.
 *
 * Strategy:
 *   1. Try selectors in priority order — first match wins.
 *   2. Validate visibility and on-page status.
 *   3. If all fail, return null — the widget will fall back to visual-only guidance.
 *
 * Selector strategy comes ranked from the LLM:
 *   - data-guider="..." (most stable, set by `guider inject`)
 *   - data-testid="..."
 *   - aria-label="..."
 *   - role + accessible-name
 *   - text content match (last resort)
 */
export function findElement(candidates) {
  if (!Array.isArray(candidates)) return null;
  for (const c of candidates) {
    const el = resolveOne(c);
    if (el && isVisible(el)) return { el, matched: c };
  }
  return null;
}

function resolveOne(c) {
  if (!c) return null;
  if (typeof c === 'string') {
    try {
      return document.querySelector(c);
    } catch {
      return null;
    }
  }
  if (c.kind === 'css') {
    try { return document.querySelector(c.value); } catch { return null; }
  }
  if (c.kind === 'data-guider') {
    return document.querySelector(`[data-guider="${cssEscape(c.value)}"]`);
  }
  if (c.kind === 'testid') {
    return document.querySelector(`[data-testid="${cssEscape(c.value)}"]`);
  }
  if (c.kind === 'aria') {
    return document.querySelector(`[aria-label="${cssEscape(c.value)}"]`);
  }
  if (c.kind === 'role-name') {
    const els = document.querySelectorAll(`[role="${cssEscape(c.role)}"]`);
    for (const el of els) {
      const name = el.getAttribute('aria-label') || el.textContent?.trim() || '';
      if (name.toLowerCase().includes(String(c.name).toLowerCase())) return el;
    }
    return null;
  }
  if (c.kind === 'text') {
    return findByText(c.value, c.tag);
  }
  return null;
}

function findByText(text, tag) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  const sel = tag || 'a, button, [role=button], [role=link], [role=tab], summary, label';
  const els = document.querySelectorAll(sel);
  let best = null;
  let bestLen = Infinity;
  for (const el of els) {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (!txt) continue;
    if (txt === t) return el;
    if (txt.includes(t) && txt.length < bestLen) { best = el; bestLen = txt.length; }
  }
  return best;
}

function isVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
  return true;
}

function cssEscape(s) {
  return String(s).replace(/["\\]/g, '\\$&');
}
