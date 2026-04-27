import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './init.js';
import { syncCommand } from './sync.js';
import { injectCommand } from './inject.js';

export async function runCli(argv) {
  const program = new Command();

  program
    .name('guider')
    .description('AI-powered navigation SDK for Next.js apps')
    .version('0.1.0');

  program
    .command('init')
    .description('Scan the codebase and produce guider.map.json')
    .option('--cwd <path>', 'Project root', process.cwd())
    .option('--out <file>', 'Output map file', 'guider.map.json')
    .option('--no-llm', 'Skip LLM enrichment (static-only map)')
    .option('--no-verify', 'Skip terminal verification UI')
    .option('--dry-run', 'Do not write the map to disk')
    .option('--api-key <key>', 'OpenAI API key (defaults to OPENAI_API_KEY env)')
    .option('--model <name>', 'OpenAI model', 'gpt-5-nano-2025-08-07')
    .action(initCommand);

  program
    .command('sync')
    .description('Diff codebase vs existing map and update only what changed')
    .option('--cwd <path>', 'Project root', process.cwd())
    .option('--map <file>', 'Existing map file', 'guider.map.json')
    .option('--no-llm', 'Skip LLM enrichment of changed pages')
    .option('--api-key <key>', 'OpenAI API key (defaults to OPENAI_API_KEY env)')
    .option('--model <name>', 'OpenAI model', 'gpt-5-nano-2025-08-07')
    .action(syncCommand);

  program
    .command('inject')
    .description('Codemod: add data-guider attributes to key interactive elements')
    .option('--cwd <path>', 'Project root', process.cwd())
    .option('--dry-run', 'Show changes but do not write files')
    .action(injectCommand);

  program.on('command:*', () => {
    console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
    program.help({ error: true });
  });

  await program.parseAsync(argv);
}
