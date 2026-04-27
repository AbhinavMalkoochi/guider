/**
 * Codemod: inject `data-guider="<stable-id>"` into key interactive elements.
 *
 * Targets:
 *   - <Link> / <a> with href (nav links)
 *   - <Button> / <button> (primary CTAs)
 *   - elements named *Trigger (modals, dropdowns, popovers, sheets)
 *   - <Tab>, <TabsTrigger> (tabs)
 *   - <input type="submit"> / <form>
 *
 * Skip rules:
 *   - already has a data-guider attribute
 *   - inside a generated/_*.{js,tsx} file
 */
import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import fg from 'fast-glob';
import jscodeshiftPkg from 'jscodeshift';

const jscodeshift = jscodeshiftPkg.withParser('tsx');

const TARGET_TAGS = new Set([
  'a', 'Link', 'NextLink',
  'button', 'Button', 'IconButton',
  'Tab', 'TabsTrigger',
  'form',
]);

function isTrigger(name) {
  return /Trigger$/.test(name);
}

function makeStableId(file, label, idx) {
  const base = path.basename(file).replace(/\..+$/, '').toLowerCase();
  const slug = (label || `el-${idx}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${base}-${slug || 'el-' + idx}`;
}

function transform(source, file) {
  const root = jscodeshift(source);
  let modified = 0;
  let counter = 0;

  root.find(jscodeshift.JSXOpeningElement).forEach((p) => {
    const node = p.node;
    const name =
      node.name?.type === 'JSXIdentifier'
        ? node.name.name
        : node.name?.type === 'JSXMemberExpression'
        ? node.name.property.name
        : null;
    if (!name) return;

    const isTarget = TARGET_TAGS.has(name) || isTrigger(name);
    if (!isTarget) return;

    // already has attribute?
    const has = node.attributes.some(
      (a) => a.type === 'JSXAttribute' && a.name?.name === 'data-guider',
    );
    if (has) return;

    // pull out a labelish attribute for the id
    let labelish = null;
    for (const a of node.attributes) {
      if (a.type !== 'JSXAttribute') continue;
      const k = a.name?.name;
      if (['href', 'aria-label', 'title', 'data-testid', 'name'].includes(k)) {
        if (a.value?.type === 'StringLiteral' || a.value?.type === 'Literal') {
          labelish = a.value.value;
          break;
        }
      }
    }

    const id = makeStableId(file, labelish, counter++);
    // Replace the opening element with a new one whose attributes include data-guider.
    // recast prints replaced nodes from scratch, so the new attribute is preserved.
    const newAttrs = [
      ...node.attributes,
      jscodeshift.jsxAttribute(
        jscodeshift.jsxIdentifier('data-guider'),
        jscodeshift.literal(id),
      ),
    ];
    p.replace(
      jscodeshift.jsxOpeningElement(node.name, newAttrs, node.selfClosing),
    );
    modified++;
  });

  return { source: root.toSource({ quote: 'single' }), modified };
}

export async function injectCommand(opts) {
  const cwd = path.resolve(opts.cwd || process.cwd());
  const files = await fg(['**/*.{jsx,tsx}'], {
    cwd,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/_*.{jsx,tsx}'],
    onlyFiles: true,
    absolute: true,
  });

  let totalFiles = 0;
  let totalElements = 0;
  for (const file of files) {
    const src = await fs.readFile(file, 'utf8');
    let result;
    try {
      result = transform(src, file);
    } catch (e) {
      console.log(chalk.dim(`  skip ${path.relative(cwd, file)} (${e.message})`));
      continue;
    }
    if (result.modified > 0) {
      totalFiles++;
      totalElements += result.modified;
      if (!opts.dryRun) await fs.writeFile(file, result.source, 'utf8');
      console.log(
        (opts.dryRun ? chalk.yellow('would patch ') : chalk.green('patched ')) +
          path.relative(cwd, file) +
          chalk.dim(`  (+${result.modified})`),
      );
    }
  }
  console.log(
    chalk.bold(
      `\n${opts.dryRun ? 'Would inject' : 'Injected'} ${totalElements} data-guider attributes across ${totalFiles} files.`,
    ),
  );
}
