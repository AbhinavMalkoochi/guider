import path from 'node:path';
import fs from 'fs-extra';
import crypto from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '../scanner/scan.js';
import { LlmClient } from '../llm/enrich.js';

function hashOfPage(p) {
  const stripEnriched = (arr) =>
    (arr || []).map((x) => {
      const { purpose, outcome, visibleWhen, describes, ...rest } = x; // eslint-disable-line no-unused-vars
      return rest;
    });
  const payload = JSON.stringify({
    interactive: stripEnriched(p.interactive),
    visuals: stripEnriched(p.visuals),
    links: p.links,
    conditions: p.conditions,
    file: p.file,
    sourceFiles: p.sourceFiles,
  });
  return crypto.createHash('sha1').update(payload).digest('hex');
}

export async function syncCommand(opts) {
  const cwd = path.resolve(opts.cwd || process.cwd());
  const mapFile = path.resolve(cwd, opts.map || 'guider.map.json');

  if (!fs.existsSync(mapFile)) {
    console.log(chalk.red(`No existing map at ${mapFile}. Run "guider init" first.`));
    return;
  }

  const existing = await fs.readJson(mapFile);
  const existingByRoute = new Map((existing.pages || []).map((p) => [p.route, p]));

  const spin = ora('Re-scanning project').start();
  const fresh = await scanProject(cwd);
  spin.succeed(`Scanned ${fresh.length} routes`);

  // Determine added / changed / removed
  const added = [];
  const changed = [];
  const unchanged = [];
  for (const f of fresh) {
    const e = existingByRoute.get(f.route);
    if (!e) added.push(f);
    else if (hashOfPage(f) !== hashOfPage(e)) changed.push({ fresh: f, prev: e });
    else unchanged.push(e);
  }
  const removed = existing.pages.filter((p) => !fresh.some((f) => f.route === p.route));

  console.log(
    `  ${chalk.green('+')} ${added.length} added   ${chalk.yellow('~')} ${changed.length} changed   ${chalk.red('-')} ${removed.length} removed   ${chalk.dim(unchanged.length + ' unchanged')}`,
  );

  const wantLlm = opts.llm !== false;
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
  let llm = null;
  if (wantLlm && apiKey) llm = new LlmClient({ apiKey, model: opts.model });

  const updated = [...unchanged];

  for (const a of added) updated.push(llm ? await llm.enrichPage(a) : a);
  for (const { fresh: f, prev } of changed) {
    const merged = { ...prev, ...f };
    updated.push(llm ? await llm.enrichPage(merged) : merged);
  }

  updated.sort((a, b) => a.route.localeCompare(b.route));

  const newMap = {
    ...existing,
    generatedAt: new Date().toISOString(),
    pages: updated,
  };
  await fs.writeJson(mapFile, newMap, { spaces: 2 });
  console.log(chalk.green(`\n  ✓ Updated ${path.relative(cwd, mapFile)}`));
}
