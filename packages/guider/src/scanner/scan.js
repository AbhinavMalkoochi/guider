/**
 * Static analysis of a Next.js codebase.
 *
 * - Discovers routes (pages/ and app/ router)
 * - For each route, parses the entry file and any locally-imported components
 * - Extracts interactive elements (buttons, links, forms, dropdowns, modals, tabs)
 * - Extracts visual elements (tables, charts, cards, counters, badges, empty states)
 * - Builds navigation graph from <Link> / router.push() calls
 * - Auto-tags categories from path + content (billing/team/permissions/etc.)
 *
 * Output shape — array of "raw page" records that LLM enrichment will refine.
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

function parseFile(file) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    return { code, ast: parse(code, PARSE_OPTS) };
  } catch (e) {
    return null;
  }
}

/* ---------- Route discovery ------------------------------------------- */

function fileToRoute(rel, kind) {
  // strip extension and "/index"
  let r = rel.replace(/\\/g, '/').replace(/\.(jsx?|tsx?|mdx?)$/, '');
  if (kind === 'app') {
    // app router: /app/foo/page -> /foo, /app/page -> /
    r = r.replace(/\/page$/, '').replace(/^app/, '') || '/';
  } else {
    r = r.replace(/\/index$/, '') || '/';
    r = r.replace(/^pages/, '') || '/';
  }
  if (!r.startsWith('/')) r = '/' + r;
  // dynamic segments
  r = r.replace(/\[\.{3}([^\]]+)\]/g, ':$1*'); // [...slug] -> :slug*
  r = r.replace(/\[([^\]]+)\]/g, ':$1');        // [id]      -> :id
  return r;
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
      c.kind === 'app'
        ? '**/page.{js,jsx,ts,tsx,mdx}'
        : '**/*.{js,jsx,ts,tsx,mdx}';
    const files = await fg(pattern, {
      cwd: root,
      ignore: ['**/node_modules/**', '**/_*.{js,jsx,ts,tsx}', '**/api/**'],
      onlyFiles: true,
    });
    for (const rel of files) {
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
  'Button', 'IconButton', 'MenuItem', 'Tab', 'TabsTrigger',
  'DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuItem',
  'Dialog', 'DialogTrigger', 'Modal', 'ModalTrigger', 'Sheet', 'SheetTrigger',
  'Popover', 'PopoverTrigger', 'Tooltip',
  'Switch', 'Checkbox', 'RadioGroup', 'Slider', 'Toggle',
]);

const VISUAL_TAGS = new Set([
  'table', 'Table', 'DataTable',
  'Chart', 'LineChart', 'BarChart', 'PieChart', 'AreaChart',
  'Card', 'StatCard', 'Counter', 'Metric', 'KPI',
  'Badge', 'Tag', 'Pill',
  'EmptyState', 'Skeleton', 'Spinner', 'Progress',
  'img', 'Image', 'Avatar',
]);

function getAttrValue(attr) {
  if (!attr) return null;
  if (!attr.value) return true; // boolean attr
  if (attr.value.type === 'StringLiteral') return attr.value.value;
  if (attr.value.type === 'JSXExpressionContainer') {
    const e = attr.value.expression;
    if (e.type === 'StringLiteral') return e.value;
    if (e.type === 'TemplateLiteral' && e.quasis.length === 1)
      return e.quasis[0].value.cooked;
    if (e.type === 'Identifier') return `{${e.name}}`;
  }
  return null;
}

function getElementText(node) {
  // Concatenate JSX text children + simple expression children
  const out = [];
  for (const child of node.children || []) {
    if (child.type === 'JSXText') {
      const t = child.value.replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    } else if (child.type === 'JSXExpressionContainer') {
      const e = child.expression;
      if (e.type === 'StringLiteral') out.push(e.value);
      else if (e.type === 'Identifier') out.push(`{${e.name}}`);
      else if (e.type === 'MemberExpression') out.push('{...}');
    } else if (child.type === 'JSXElement') {
      const inner = getElementText(child);
      if (inner) out.push(inner);
    }
  }
  return out.join(' ').trim();
}

function tagName(opening) {
  const n = opening.name;
  if (n.type === 'JSXIdentifier') return n.name;
  if (n.type === 'JSXMemberExpression')
    return `${tagName({ name: n.object })}.${n.property.name}`;
  return null;
}

function extractElements(ast, file) {
  const interactive = [];
  const visuals = [];
  const links = []; // outbound nav links

  traverse(ast, {
    JSXElement(p) {
      const opening = p.node.openingElement;
      const name = tagName(opening);
      if (!name) return;

      const attrs = {};
      for (const a of opening.attributes) {
        if (a.type !== 'JSXAttribute') continue;
        attrs[a.name.name] = getAttrValue(a);
      }
      const text = getElementText(p.node);

      const isInteractive =
        INTERACTIVE_TAGS.has(name) ||
        attrs.onClick ||
        attrs.onSubmit ||
        attrs.role === 'button' ||
        attrs.role === 'link' ||
        attrs.role === 'tab';

      const isVisual = VISUAL_TAGS.has(name);

      if (isInteractive) {
        interactive.push({
          tag: name,
          label: text || attrs['aria-label'] || attrs.title || attrs.placeholder || null,
          href: attrs.href || attrs.to || null,
          testId: attrs['data-testid'] || attrs['data-guider'] || null,
          onClick: attrs.onClick || null,
          type: name.toLowerCase().includes('modal') || name.toLowerCase().includes('dialog')
            ? 'modal-trigger'
            : name.toLowerCase().includes('drop') || name.toLowerCase().includes('menu')
            ? 'dropdown'
            : name.toLowerCase().includes('tab')
            ? 'tab'
            : name === 'form'
            ? 'form'
            : (name === 'a' || name === 'Link' || name === 'NextLink' || attrs.href)
            ? 'link'
            : 'button',
        });
        if (attrs.href || attrs.to) links.push(attrs.href || attrs.to);
      }

      if (isVisual) {
        visuals.push({
          tag: name,
          label: text || attrs.title || attrs['aria-label'] || null,
          kind: name.toLowerCase().includes('chart')
            ? 'chart'
            : name.toLowerCase().includes('table')
            ? 'table'
            : name.toLowerCase().includes('card')
            ? 'card'
            : name.toLowerCase().includes('badge') || name.toLowerCase().includes('tag') || name.toLowerCase().includes('pill')
            ? 'badge'
            : name.toLowerCase().includes('empty')
            ? 'empty-state'
            : 'visual',
        });
      }
    },
    CallExpression(p) {
      // router.push('/foo')
      const callee = p.node.callee;
      if (
        callee.type === 'MemberExpression' &&
        callee.property.name === 'push' &&
        callee.object.type === 'Identifier' &&
        /router|navigate/i.test(callee.object.name)
      ) {
        const arg = p.node.arguments[0];
        if (arg && arg.type === 'StringLiteral') links.push(arg.value);
      }
    },
  });

  return { interactive, visuals, links };
}

/* ---------- Detect conditional renders -------------------------------- */

function detectConditionals(ast) {
  const conditions = [];
  traverse(ast, {
    LogicalExpression(p) {
      if (p.node.operator !== '&&') return;
      // pattern: (user.role === 'admin') && <Something />
      const left = p.node.left;
      const right = p.node.right;
      if (right.type !== 'JSXElement') return;
      const cond = describeCondition(left);
      if (!cond) return;
      const tag = tagName(right.openingElement);
      conditions.push({ tag, condition: cond });
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
  if (node.type === 'CallExpression') {
    return `${describeCondition(node.callee) || '?'}()`;
  }
  return null;
}

/* ---------- Page-level scan ------------------------------------------- */

export function scanFile(file, cwd, visited = new Set(), depth = 0) {
  if (visited.has(file) || depth > 3) {
    return { interactive: [], visuals: [], links: [], conditions: [], files: [] };
  }
  visited.add(file);

  const parsed = parseFile(file);
  if (!parsed) return { interactive: [], visuals: [], links: [], conditions: [], files: [file] };
  const { ast } = parsed;

  const own = extractElements(ast, file);
  const conds = detectConditionals(ast);
  const files = [file];

  // Pull in locally-imported components (relative paths)
  const importsToVisit = [];
  traverse(ast, {
    ImportDeclaration(p) {
      const src = p.node.source.value;
      if (src.startsWith('.') || src.startsWith('/') || src.startsWith('@/')) {
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
  const routes = await discoverRoutes(cwd);
  const pages = [];
  for (const r of routes) {
    const data = scanFile(r.file, cwd);
    pages.push({
      route: r.route,
      file: path.relative(cwd, r.file),
      router: r.kind,
      categories: categorize(r.route, data),
      interactive: dedupe(data.interactive),
      visuals: dedupe(data.visuals),
      links: data.links,
      conditions: data.conditions,
      sourceFiles: data.files.map((f) => path.relative(cwd, f)),
    });
  }
  // build inbound link graph
  const inbound = new Map();
  for (const p of pages) {
    for (const l of p.links) {
      if (!inbound.has(l)) inbound.set(l, []);
      inbound.get(l).push(p.route);
    }
  }
  for (const p of pages) p.linkedFrom = inbound.get(p.route) || [];
  return pages;
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
