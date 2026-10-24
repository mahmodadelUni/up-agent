#!/usr/bin/env node
// Lints Markdown test cases before any tokens are spent on them.
//
// Usage: node scripts/lint-tests.mjs [files or folders...] [--tag smoke] [--json]
// Exit codes: 0 all valid (warnings allowed), 1 at least one test has errors.
import { selectTests } from "./lib/tests.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const ti = args.indexOf("--tag");
const tag = ti >= 0 ? args[ti + 1] : null;
const inputs = args.filter((a, i) => !a.startsWith("--") && !(ti >= 0 && i === ti + 1));

const tests = selectTests(inputs, tag);
const bad = tests.filter((t) => t.errors.length);

if (json) {
  process.stdout.write(
    JSON.stringify(
      tests.map((t) => ({ file: t.file, id: t.meta.id || null, errors: t.errors, warnings: t.warnings })),
      null,
      2,
    ) + "\n",
  );
} else {
  if (!tests.length) console.log(`No tests found${tag ? ` with tag "${tag}"` : ""}.`);
  for (const t of tests) {
    const mark = t.errors.length ? "✗" : t.warnings.length ? "!" : "✓";
    console.log(`${mark} ${t.file}`);
    for (const e of t.errors) console.log(`    error:   ${e}`);
    for (const w of t.warnings) console.log(`    warning: ${w}`);
  }
  console.log(
    `\n${tests.length} test(s): ${tests.length - bad.length} valid, ${bad.length} with errors, ` +
      `${tests.filter((t) => t.warnings.length).length} with warnings.`,
  );
}
process.exit(bad.length ? 1 : 0);
