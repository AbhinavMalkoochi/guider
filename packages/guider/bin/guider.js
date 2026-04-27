#!/usr/bin/env node
import { runCli } from '../src/cli/index.js';

runCli(process.argv).then(
  () => process.exit(0),
  (err) => {
    console.error(err?.stack || err?.message || err);
    process.exit(1);
  },
);
