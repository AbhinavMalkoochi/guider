import prompts from 'prompts';
import chalk from 'chalk';

/**
 * Terminal verification UI. Walks each page and lets the user:
 *  - Accept as-is
 *  - Edit purpose/summary
 *  - Mark page to skip (exclude from final map)
 *  - Quit and accept the rest
 *
 * Returns the (possibly edited) pages.
 */
export async function verifyPages(pages) {
  console.log(
    chalk.bold(`\nVerification — ${pages.length} pages. ` ) +
      chalk.dim('[a]ccept · [e]dit · [s]kip · [q]uit & accept rest\n'),
  );

  const out = [];
  let i = 0;
  while (i < pages.length) {
    const p = pages[i];
    printPage(p, i + 1, pages.length);

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'Action',
      choices: [
        { title: 'Accept', value: 'a' },
        { title: 'Edit purpose / summary', value: 'e' },
        { title: 'Skip this page (exclude)', value: 's' },
        { title: 'Quit & accept all remaining as-is', value: 'q' },
      ],
      initial: 0,
    });

    if (!action || action === 'a') {
      out.push(p);
    } else if (action === 'e') {
      const edits = await prompts([
        { type: 'text', name: 'purpose', message: 'Purpose', initial: p.purpose || '' },
        { type: 'text', name: 'summary', message: 'Summary', initial: p.summary || '' },
      ]);
      out.push({ ...p, purpose: edits.purpose || p.purpose, summary: edits.summary || p.summary, confidence: 'high', verified: true });
    } else if (action === 's') {
      // dropped
    } else if (action === 'q') {
      out.push(p, ...pages.slice(i + 1));
      break;
    }
    i++;
  }

  return out;
}

function printPage(p, idx, total) {
  const conf = p.confidence || 'medium';
  const confColor = conf === 'high' ? chalk.green : conf === 'low' ? chalk.red : chalk.yellow;
  console.log(
    chalk.cyan(`\n[${idx}/${total}] `) +
      chalk.bold(p.route) +
      '  ' +
      confColor(`(${conf})`) +
      chalk.dim(`  ${p.file}`),
  );
  if (p.purpose) console.log('  ' + chalk.bold('Purpose: ') + p.purpose);
  if (p.summary) console.log('  ' + chalk.bold('Summary: ') + p.summary);
  if (p.categories?.length) console.log('  ' + chalk.bold('Tags: ') + p.categories.join(', '));
  console.log(
    '  ' +
      chalk.bold('Elements: ') +
      `${p.interactive?.length || 0} interactive · ${p.visuals?.length || 0} visual · ${
        p.modals?.length || 0
      } modals · ${p.dropdowns?.length || 0} dropdowns`,
  );
  if (p.linkedFrom?.length)
    console.log('  ' + chalk.dim('Linked from: ' + p.linkedFrom.slice(0, 5).join(', ')));
}
