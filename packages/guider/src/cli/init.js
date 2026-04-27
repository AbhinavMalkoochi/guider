import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '../scanner/scan.js';
import { LlmClient } from '../llm/enrich.js';
import { verifyPages } from '../verify/tui.js';

export async function initCommand(opts) {
  const cwd = path.resolve(opts.cwd || process.cwd());
  const outFile = path.resolve(cwd, opts.out || 'guider.map.json');

  console.log(chalk.bold.cyan('\n  guider init\n'));
  console.log('  ' + chalk.dim('cwd: ') + cwd);

  const spin = ora('Scanning routes & components').start();
  const pages = await scanProject(cwd);
  spin.succeed(`Scanned ${pages.length} routes`);

  if (pages.length === 0) {
    console.log(chalk.yellow('\nNo pages found. Looked for pages/, src/pages/, app/, src/app/.'));
    return;
  }

  let enriched = pages;
  const wantLlm = opts.llm !== false;
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;

  if (wantLlm && !apiKey) {
    console.log(
      chalk.yellow(
        '\n  No OpenAI API key found. Set OPENAI_API_KEY or pass --api-key, or run with --no-llm for static-only output.',
      ),
    );
  }

  if (wantLlm && apiKey) {
    const llm = new LlmClient({ apiKey, model: opts.model });
    const ll = ora(`Enriching with ${opts.model || 'gpt-5-nano-2025-08-07'}`).start();
    enriched = [];
    for (let i = 0; i < pages.length; i++) {
      ll.text = `Enriching (${i + 1}/${pages.length}) ${pages[i].route}`;
      enriched.push(await llm.enrichPage(pages[i]));
    }
    ll.succeed(`Enriched ${enriched.length} pages`);
  }

  if (opts.verify !== false && process.stdout.isTTY) {
    enriched = await verifyPages(enriched);
  } else if (opts.verify !== false) {
    console.log(chalk.dim('  (non-interactive terminal — skipping verification UI)'));
  }

  const map = {
    version: '0.1',
    generatedAt: new Date().toISOString(),
    project: path.basename(cwd),
    pages: enriched,
  };

  if (opts.dryRun) {
    console.log(chalk.dim('\n--dry-run: not writing map. Sample:\n'));
    console.log(JSON.stringify(map, null, 2).slice(0, 2000) + '\n...');
    return;
  }

  await fs.writeJson(outFile, map, { spaces: 2 });
  console.log(chalk.green(`\n  ✓ Wrote ${path.relative(cwd, outFile)}`));
  console.log(
    chalk.dim(
      '  Drop <GuiderWidget mapUrl="/guider.map.json" apiKey={process.env.NEXT_PUBLIC_OPENAI_KEY} /> in your root layout.\n',
    ),
  );
}
