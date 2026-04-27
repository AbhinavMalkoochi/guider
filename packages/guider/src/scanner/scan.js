/**
 * Static analysis of a Next.js codebase.
 *
 * - Discovers routes (pages/ and app/ router, including route groups + dynamic + catch-all)
 * - Skips parallel routes (@modal), private folders (_*), api routes
 * - For each route, parses the entry file and any locally-imported components (depth-limited)
 * - Extracts:
 *     · interactive elements (button, link, form, dropdown, modal/dialog/sheet/popover triggers, tab, input, switch, ...)
 *     · visual elements (table, chart, card, badge, counter, empty-state, image)
 *     · conditional renders (logical &&, ternary, role/plan/state-gated UI)
 *     · navigation graph from <Link> / router.push() / redirect()
 *     · handler bodies — when an onClick is a local function, we look it up and read its body
 *       to infer outcomes ("opens a dialog", "navigates to /x", "submits a form", "calls /api/y")
 * - Auto-tags semantic categories
 * - Results are deterministic + parallel-safe (file-level scans run with bounded concurrency)
 */
import path from 'node:path';
import fs from 'node:fs';
import fg from 'fast-glob';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { categorize } from './categorize.js';
import { resolveImport } from './resolve.js';

const traverse = _traverse.default || _traverse;

const PARSE_OPTS = {
  sourceType: 'module',
  errorRecovery: true,
  plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy', 'topLevelAwait'],
};

const astCache = new Map();
function parseFile(file) {
  if (astCache.has(file)) return astCache.get(file);
  let r = null;
  try {
    const code = fs.readFileSync(file, 'utf8');
    r = { code, ast: parse(code, PARSE_OPTS) };
  } catch {
    r = null;
  }
  astCache.set(file, r);
  return r;
}

/* ---------- Route discovery ------------------------------------------- */

function fileToRoute(rel, kind) {
  let r = rel.replace(/\\/g, '/').replace(/\.(jsx?|tsx?|mdx?)$/, '');
  if (kind === 'app') {
    r = r.replace(/\/page$/, '').replace(/^app/, '');
  } else {
    r = r.replace(/\/index$/, '').replace(/^pages/, '');
  }
  // Strip route groups (foo) and remove parallel segments @modal
  r = r
    .split('/')
    .filter((seg) => !seg.startsWith('@')) // parallel routes don't add to URL
    .map((seg) => (/^\(.+\)$/.test(seg) ? '' : seg))
    .filter(Boolean)
    .join('/');
  r = r ? '/' + r : '/';
  // Dynamic segments
  r = r.replace(/\[\.{3}([^\]]+)\]/g, ':$1*'); // [...slug]
  r = r.replace(/\[\[\.{3}([^\]]+)\]\]/g, ':$1?'); // [[...slug]]
  r = r.replace(/\[([^\]]+)\]/g, ':$1');
  return r;
}

function shouldSkipFile(rel, kind) {
  // private folders, api routes, layouts, loading, error, not-found, route handlers
  if (/(^|\/)_/.test(rel)) return true;
  if (/(^|\/)api(\/|$)/.test(rel)) return true;
  if (kind === 'app') {
    const base = path.basename(rel);
    if (
      ['layout', 'loading', 'error', 'not-found', 'template', 'route', 'default'].some((n) =>
        base.startsWith(n + '.'),
      )
    )
      return true;
  }
  return false;
}

export async function discoverRoutes(cwd) {
  const candidates = [
    { kind: 'pages', root: 'pages' },
    { kind: 'pages', root: 'src/pages' },
    { kind: 'app', root: 'app' },
    { kind: 'app', root: 'src/app' },
  ];
  const out = [];
  for (const c of candidates) {
    const root = path.join(cwd, c.root);
    if (!fs.existsSync(root)) continue;
    const pattern =
      c.kind === 'app' ? '**/page.{js,jsx,ts,tsx,mdx}' : '**/*.{js,jsx,ts,tsx,mdx}';
    const files = await fg(pattern, {
      cwd: root,
      ignore: ['**/node_modules/**'],
      onlyFiles: true,
    });
    for (const rel of files) {
      if (shouldSkipFile(rel, c.kind)) continue;
      const abs = path.join(root, rel);
      const fullRel = path.posix.join(c.root, rel.replace(/\\/g, '/'));
      const route = fileToRoute(fullRel, c.kind);
      out.push({ route, file: abs, kind: c.kind });
    }
  }
  // de-dupe — prefer app router if both define same route
  const seen = new Map();
  for (const r of out) {
    const cur = seen.get(r.route);
    if (!cur || (cur.kind === 'pages' && r.kind === 'app')) seen.set(r.route, r);
  }
  return [...seen.values()].sort((a, b) => a.route.localeCompare(b.route));
}

/* ---------- Element extraction ---------------------------------------- */

const INTERACTIVE_TAGS = new Set([
  'button', 'a', 'Link', 'NextLink',
  'input', 'textarea', 'select', 'option', 'form',
  'Button', 'IconButton', 'MenuItem', 'Tab', 'TabsTrigger', 'TabTrigger',
  'DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuItem', 'MenubarTrigger',
  'Dialog', 'DialogTrigger', 'Modal', 'ModalTrigger', 'Sheet', 'SheetTrigger', 'Drawer', 'DrawerTrigger',
  'AlertDialogTrigger', 'Popover', 'PopoverTrigger', 'Tooltip', 'TooltipTrigger',
  'Switch', 'Checkbox', 'RadioGroup', 'RadioGroupItem', 'Slider', 'Toggle',
  'Combobox', 'Listbox', 'ContextMenuTrigger',
]);

const VISUAL_TAGS = new Set([
  'table', 'Table', 'DataTable', 'DataGrid',
  'Chart', 'LineChart', 'BarChart', 'PieChart', 'AreaChart', 'RadarChart',
  'Card', 'StatCard', 'Counter', 'Metric', 'KPI',
  'Badge', 'Tag', 'Pill', 'Chip',
  'EmptyState', 'Skeleton', 'Spinner', 'Progress', 'Loader',
  'img', 'Image', 'Avatar', 'AvatarGroup',
]);

function tagName(opening) {
  const n = opening.name;
  if (n.type === 'JSXIdentifier') return n.name;
  if (n.type === 'JSXMemberExpression') {
    // Dialog.Trigger -> "Dialog.Trigger" (we also expose .last for matching)
    const parts = [];
    let cur = n;
    while (cur && cur.type === 'JSXMemberExpression') {
      parts.unshift(cur.property.name);
      cur = cur.object;
    }
    if (cur && cur.type === 'JSXIdentifier') parts.unshift(cur.name);
    return parts.join('.');
  }
  return null;
}

function lastSegment(name) {
  return (name || '').split('.').pop() || '';
}

function getAttrValue(attr) {
  if (!attr) return null;
  if (!attr.value) return true;
  if (attr.value.type === 'StringLiteral') return attr.value.value;
  if (attr.value.type === 'JSXExpressionContainer') {
    const e = attr.value.expression;
    if (e.type === 'StringLiteral') return e.value;
    if (e.type === 'TemplateLiteral' && e.quasis.length === 1)
      return e.quasis[0].value.cooked;
    if (e.type === 'Identifier') return `{${e.name}}`;
    if (e.type === 'ArrowFunctionExpression' || e.type === 'FunctionExpression') return '__fn__';
    if (e.type === 'MemberExpression') return `{...}`;
  }
  return null;
}

function getAttrExpression(attr) {
  if (!attr || !attr.value) return null;
  if (attr.value.type === 'JSXExpressionContainer') return attr.value.expression;
  return null;
}

function getElementText(node) {
  const out = [];
  for (const child of node.children || []) {
    if (child.type === 'JSXText') {
      const t = child.value.replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    } else if (child.type === 'JSXExpressionContainer') {
      const e = child.expression;
      if (e.type === 'StringLiteral') out.push(e.value);
      else if (e.type === 'Identifier') out.push(`{${e.name}}`);
      else if (e.type === 'TemplateLiteral' && e.quasis.length === 1)
        out.push(e.quasis[0].value.cooked);
    } else if (child.type === 'JSXElement') {
      const inner = getElementText(child);
      if (inner) out.push(inner);
    }
  }
  return out.join(' ').trim();
}

/* ---------- Handler tracing ------------------------------------------- */

/**
 * Build an in-file symbol table of function-like declarations so that
 * `onClick={handleSave}` can be looked up to read its body.
 */
function buildSymbolTable(ast) {
  const t = new Map();
  traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id?.name) t.set(p.node.id.name, p.node);
    },
    VariableDeclarator(p) {
      const name = p.node.id?.name;
      const init = p.node.init;
      if (!name || !init) return;
      if (
        init.type === 'ArrowFunctionExpression' ||
        init.type === 'FunctionExpression'
      )
        t.set(name, init);
    },
  });
  return t;
}

/**
 * Given an onClick expression, return a short user-facing description of its outcome.
 * Examples:
 *   () => router.push('/foo')      → "navigates to /foo"
 *   () => setIsOpen(true)          → "opens a dialog"
 *   handleSave                     → traced from symbol table
 *   () => fetch('/api/x', ...)     → "calls /api/x"
 */
function describeHandler(expr, symbols, depth = 0) {
  if (!expr || depth > 2) return null;

  if (expr.type === 'Identifier') {
    const sym = symbols.get(expr.name);
    return sym ? describeFunctionBody(sym, symbols, depth + 1) : null;
  }
  if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
    return describeFunctionBody(expr, symbols, depth + 1);
  }
  if (expr.type === 'CallExpression') {
    return describeCall(expr);
  }
  return null;
}

function describeFunctionBody(fn, symbols, depth) {
  const body = fn.body;
  if (!body) return null;
  const stmts =
    body.type === 'BlockStatement' ? body.body : [{ type: 'ExpressionStatement', expression: body }];
  const observations = [];
  for (const s of stmts) {
    const e = s.expression || s.argument || null;
    if (!e) continue;
    const o = describeCall(e) || describeHandler(e, symbols, depth + 1);
    if (o) observations.push(o);
  }
  return observations.length ? observations.join('; ') : null;
}

function describeCall(expr) {
  if (!expr || expr.type !== 'CallExpression') return null;
  const c = expr.callee;
  // router.push('/x') | router.replace('/x') | redirect('/x')
  if (
    c.type === 'MemberExpression' &&
    /push|replace|prefetch/.test(c.property.name) &&
    /router|navigate/i.test(c.object.name || '')
  ) {
    const a = expr.arguments[0];
    if (a?.type === 'StringLiteral') return `navigates to ${a.value}`;
  }
  if (c.type === 'Identifier' && /redirect/i.test(c.name)) {
    const a = expr.arguments[0];
    if (a?.type === 'StringLiteral') return `redirects to ${a.value}`;
  }
  // setX(true) / setX(prev => !prev) / setOpen(...)
  if (c.type === 'Identifier' && /^set[A-Z]/.test(c.name)) {
    const a = expr.arguments[0];
    if (a?.type === 'BooleanLiteral')
      return `${a.value ? 'opens' : 'closes'} ${stateName(c.name)}`;
    return `toggles ${stateName(c.name)}`;
  }
  // fetch('/api/...')
  if (c.type === 'Identifier' && c.name === 'fetch') {
    const a = expr.arguments[0];
    if (a?.type === 'StringLiteral') return `calls ${a.value}`;
  }
  // form.handleSubmit / submit()
  if (c.type === 'MemberExpression' && /submit/i.test(c.property.name)) return 'submits the form';
  if (c.type === 'Identifier' && /submit/i.test(c.name)) return 'submits the form';
  // mutation.mutate(...) / trpc / useMutation
  if (c.type === 'MemberExpression' && /mutate/i.test(c.property.name)) return 'submits a server action';
  return null;
}

function stateName(setter) {
  // setIsOpen → "the dialog", setShowMenu → "the menu", setEditing → "edit mode"
  const n = setter.replace(/^set/, '');
  if (/open|dialog|modal/i.test(n)) return 'a dialog';
  if (/menu|drop/i.test(n)) return 'the menu';
  if (/drawer|sheet|panel/i.test(n)) return 'a side panel';
  if (/show|visible/i.test(n)) return n.replace(/show|visible/gi, '').toLowerCase().trim() + ' visibility';
  return n.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
}

/* ---------- Conditional detection ------------------------------------- */

function describeCondition(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral') return `"${node.value}"`;
  if (node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') return String(node.value);
  if (node.type === 'NullLiteral') return 'null';
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const obj = describeCondition(node.object) || '?';
    const prop = node.computed ? `[${describeCondition(node.property) || '?'}]` : `.${node.property.name || '?'}`;
    return `${obj}${prop}`;
  }
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    const l = describeCondition(node.left);
    const r = describeCondition(node.right);
    return `${l} ${node.operator} ${r}`;
  }
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    return `!${describeCondition(node.argument)}`;
  }
  if (node.type === 'CallExpression') return `${describeCondition(node.callee) || '?'}()`;
  return null;
}

function detectConditionals(ast) {
  const conditions = [];
  traverse(ast, {
    LogicalExpression(p) {
      if (p.node.operator !== '&&') return;
      const left = p.node.left;
      const right = p.node.right;
      if (right.type !== 'JSXElement') return;
      const cond = describeCondition(left);
      if (!cond) return;
      conditions.push({ tag: tagName(right.openingElement), condition: cond });
    },
    ConditionalExpression(p) {
      const cond = describeCondition(p.node.test);
      if (!cond) return;
      const c = p.node.consequent;
      const a = p.node.alternate;
      if (c.type === 'JSXElement') {
        conditions.push({ tag: tagName(c.openingElement), condition: cond });
      }
      if (a && a.type === 'JSXElement') {
        conditions.push({ tag: tagName(a.openingElement), condition: `not (${cond})` });
      }
    },
  });
  return conditions;
}

/* ---------- File-level extraction ------------------------------------- */

function extractElements(ast) {
  const symbols = buildSymbolTable(ast);
  const interactive = [];
  const visuals = [];
  const links = [];

  traverse(ast, {
    JSXElement(p) {
      const opening = p.node.openingElement;
      const fullName = tagName(opening);
      const name = lastSegment(fullName);
      if (!fullName) return;

      const attrs = {};
      const attrExprs = {};
      for (const a of opening.attributes) {
        if (a.type !== 'JSXAttribute') continue;
        attrs[a.name.name] = getAttrValue(a);
        attrExprs[a.name.name] = getAttrExpression(a);
      }
      const text = getElementText(p.node);

      const lower = name.toLowerCase();
      const isTriggerSuffix = /trigger$/i.test(name);
      const isInteractive =
        INTERACTIVE_TAGS.has(name) ||
        INTERACTIVE_TAGS.has(fullName) ||
        isTriggerSuffix ||
        attrs.onClick ||
        attrs.onSubmit ||
        attrs.role === 'button' ||
        attrs.role === 'link' ||
        attrs.role === 'tab' ||
        attrs.role === 'menuitem';

      const isVisual = VISUAL_TAGS.has(name);

      if (isInteractive) {
        const outcome =
          (attrs.href || attrs.to)
            ? `navigates to ${attrs.href || attrs.to}`
            : describeHandler(attrExprs.onClick, symbols) ||
              describeHandler(attrExprs.onSubmit, symbols) ||
              null;

        const rec = {
          tag: fullName,
          label:
            text ||
            attrs['aria-label'] ||
            attrs.title ||
            attrs.placeholder ||
            null,
          href: attrs.href || attrs.to || null,
          testId: attrs['data-testid'] || null,
          guiderId: attrs['data-guider'] || null,
          aria: {
            label: attrs['aria-label'] || null,
            role: attrs.role || null,
            describedby: attrs['aria-describedby'] || null,
            controls: attrs['aria-controls'] || null,
          },
          outcome,
          type:
            isTriggerSuffix && /dialog|modal|sheet|drawer|alert/i.test(lower)
              ? 'modal-trigger'
              : isTriggerSuffix && /menu|drop|popover/i.test(lower)
              ? 'dropdown'
              : isTriggerSuffix && /tooltip/i.test(lower)
              ? 'tooltip'
              : /^tab/i.test(name)
              ? 'tab'
              : name === 'form' || name === 'Form'
              ? 'form'
              : name === 'input' || name === 'textarea' || name === 'select' || /Field$/.test(name)
              ? 'input'
              : (attrs.href || attrs.to || name === 'a' || name === 'Link' || name === 'NextLink')
              ? 'link'
              : /switch|toggle|checkbox/i.test(lower)
              ? 'toggle'
              : 'button',
        };
        interactive.push(rec);
        if (attrs.href || attrs.to) links.push(attrs.href || attrs.to);
        // also pull links discovered inside handlers
        if (outcome) {
          const m = outcome.match(/(?:navigates|redirects) to (\S+)/);
          if (m) links.push(m[1]);
        }
      }

      if (isVisual) {
        visuals.push({
          tag: fullName,
          label: text || attrs.title || attrs['aria-label'] || null,
          kind: lower.includes('chart')
            ? 'chart'
            : lower.includes('table') || lower.includes('grid')
            ? 'table'
            : lower.includes('card') || lower.includes('metric') || lower.includes('counter') || lower.includes('kpi') || lower.includes('stat')
            ? 'card'
            : lower.includes('badge') || lower.includes('tag') || lower.includes('pill') || lower.includes('chip')
            ? 'badge'
            : lower.includes('empty')
            ? 'empty-state'
            : lower.includes('progress') || lower.includes('skeleton') || lower.includes('spinner') || lower.includes('loader')
            ? 'loading'
            : lower.includes('avatar') || lower === 'image' || lower === 'img'
            ? 'image'
            : 'visual',
        });
      }
    },
    CallExpression(p) {
      const callee = p.node.callee;
      if (
        callee.type === 'MemberExpression' &&
        /push|replace/.test(callee.property.name) &&
        /router|navigate/i.test(callee.object.name || '')
      ) {
        const arg = p.node.arguments[0];
        if (arg?.type === 'StringLiteral') links.push(arg.value);
      }
      if (callee.type === 'Identifier' && /redirect/i.test(callee.name)) {
        const arg = p.node.arguments[0];
        if (arg?.type === 'StringLiteral') links.push(arg.value);
      }
    },
  });

  return { interactive, visuals, links };
}

/* ---------- Recursive scan ------------------------------------------- */

export function scanFile(file, cwd, visited = new Set(), depth = 0) {
  if (visited.has(file) || depth > 4) {
    return { interactive: [], visuals: [], links: [], conditions: [], files: [] };
  }
  visited.add(file);

  const parsed = parseFile(file);
  if (!parsed) return { interactive: [], visuals: [], links: [], conditions: [], files: [file] };
  const { ast } = parsed;

  const own = extractElements(ast);
  const conds = detectConditionals(ast);
  const files = [file];

  const importsToVisit = [];
  traverse(ast, {
    ImportDeclaration(p) {
      // Skip type-only imports
      if (p.node.importKind === 'type') return;
      const src = p.node.source.value;
      if (src.startsWith('.') || src.startsWith('/') || src.startsWith('@/')) {
        const resolved = resolveImport(src, file, cwd);
        if (resolved) importsToVisit.push(resolved);
      }
    },
    ExportAllDeclaration(p) {
      const src = p.node.source?.value;
      if (src && (src.startsWith('.') || src.startsWith('@/'))) {
        const resolved = resolveImport(src, file, cwd);
        if (resolved) importsToVisit.push(resolved);
      }
    },
  });

  for (const imp of importsToVisit) {
    const sub = scanFile(imp, cwd, visited, depth + 1);
    own.interactive.push(...sub.interactive);
    own.visuals.push(...sub.visuals);
    own.links.push(...sub.links);
    conds.push(...sub.conditions);
    files.push(...sub.files);
  }

  return {
    interactive: own.interactive,
    visuals: own.visuals,
    links: [...new Set(own.links.filter(Boolean))],
    conditions: conds,
    files,
  };
}

/* ---------- Top-level orchestrator ------------------------------------ */

export async function scanProject(cwd) {
  astCache.clear();
  const routes = await discoverRoutes(cwd);

  // Concurrent file scans (cap to keep memory bounded on large monorepos)
  const CONCURRENCY = 8;
  const pages = new Array(routes.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, routes.length) }, async () => {
    while (cursor < routes.length) {
      const i = cursor++;
      const r = routes[i];
      const data = scanFile(r.file, cwd);
      pages[i] = {
        route: r.route,
        file: path.relative(cwd, r.file),
        router: r.kind,
        categories: categorize(r.route, data),
        interactive: dedupe(data.interactive),
        visuals: dedupe(data.visuals),
        links: data.links,
        conditions: data.conditions,
        sourceFiles: data.files.map((f) => path.relative(cwd, f)),
      };
    }
  });
  await Promise.all(workers);

  // Build inbound link graph (match concrete and dynamic routes)
  const inbound = new Map();
  for (const p of pages) {
    for (const l of p.links) {
      const target = matchRoute(l, pages.map((x) => x.route));
      if (!target) continue;
      if (!inbound.has(target)) inbound.set(target, new Set());
      inbound.get(target).add(p.route);
    }
  }
  for (const p of pages) p.linkedFrom = [...(inbound.get(p.route) || [])];
  return pages;
}

function matchRoute(href, allRoutes) {
  if (!href || typeof href !== 'string') return null;
  // strip query / hash
  const clean = href.split(/[?#]/)[0];
  if (allRoutes.includes(clean)) return clean;
  // try matching against dynamic routes
  for (const r of allRoutes) {
    if (!r.includes(':')) continue;
    const re = new RegExp(
      '^' +
        r
          .replace(/[\\^$.*+?()[\]{}|]/g, (c) => (c === ':' ? c : '\\' + c))
          .replace(/:([a-zA-Z0-9_]+)\*/g, '.*')
          .replace(/:([a-zA-Z0-9_]+)/g, '[^/]+') +
        '$',
    );
    if (re.test(clean)) return r;
  }
  return null;
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const key = `${x.tag}|${x.label || ''}|${x.href || ''}|${x.kind || x.type || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}
