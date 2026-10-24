#!/usr/bin/env node
// Starts a run: picks and lints the tests, creates results/runs/<run-id>/, records context.
//
// Usage: node scripts/run-start.mjs [--label smoke] [--tag smoke] <files or folders...>
// Prints one JSON object:
//   { "run_dir": "results/runs/2026-10-19_20-24-05_smoke", "run": [{tc_id,file}], "blocked": [{tc_id,file,reason}] }
// Tests that fail the linter are recorded as BLOCKED right away and are not given to the agent.
import fs from "node:fs";
import path from "node:path";
import {
  RUNS,
  LATEST_FILE,
  rel,
  writeJson,
  tryExec,
  localStamp,
  slug,
} from "./lib/common.mjs";
import { selectTests } from "./lib/tests.mjs";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const label = opt("--label");
const tag = opt("--tag");
const skip = new Set();
["--label", "--tag"].forEach((n) => {
  const i = args.indexOf(n);
  if (i >= 0) skip.add(i).add(i + 1);
});
const inputs = args.filter((_, i) => !skip.has(i));

const tests = selectTests(inputs, tag);

// ---- create the run folder
const now = new Date();
let id = localStamp(now) + (label || tag ? `_${slug(label || tag)}` : "");
let n = 2;
while (fs.existsSync(path.join(RUNS, id)))
  id = `${id.replace(/-\d+$/, "")}-${n++}`;
const dir = path.join(RUNS, id);
for (const sub of ["data", "screenshots", "bugs"])
  fs.mkdirSync(path.join(dir, sub), { recursive: true });

// ---- context for the report
const env = process.env;
const run = {
  id,
  label: label || tag || "automation",
  tag: tag || null,
  inputs,
  started_at: now.toISOString(),
  finished_at: null,
  // Runs are always started on a QA engineer's machine: interactively or with `claude -p`.
  trigger: "local",
  headed: env.HEADED === "1",
  base_url_override: env.BASE_URL || null,
  // Optional: filled only when the project happens to be inside a git repository.
  git: {
    branch: tryExec("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
    sha: tryExec("git", ["rev-parse", "HEAD"]),
  },
  tools: {
    node: process.version,
    "playwright-cli": tryExec("playwright-cli", ["--version"]),
    "claude-code": tryExec("claude", ["--version"]),
    model: env.QA_MODEL || null,
  },
  planned: tests.map((t) => ({
    tc_id: t.meta.id || path.basename(t.file, ".md"),
    file: t.file,
    title: t.meta.title || path.basename(t.file, ".md"),
    priority: t.meta.priority || null,
    type: t.meta.type || null,
    tags: Array.isArray(t.meta.tags)
      ? t.meta.tags
      : t.meta.tags
        ? [t.meta.tags]
        : [],
    lint_warnings: t.warnings,
  })),
};
writeJson(path.join(dir, "run.json"), run);

// ---- malformed tests are BLOCKED without spending a browser session on them
const out = { run_dir: rel(dir), run_id: id, run: [], blocked: [] };
for (const t of tests) {
  const tcId = t.meta.id || path.basename(t.file, ".md");
  if (t.errors.length) {
    const reason = `Malformed test (linter): ${t.errors.join("; ")}`;
    writeJson(path.join(dir, "data", `${tcId}.json`), {
      tc_id: tcId,
      title: t.meta.title || tcId,
      file: t.file,
      status: "BLOCKED",
      category: "test-defect",
      category_reason:
        "The test file does not pass scripts/lint-tests.mjs, so it was not executed.",
      blocked_reason: reason,
      started_at: now.toISOString(),
      finished_at: now.toISOString(),
      attempts: [],
      observations: { console_errors: [], failed_requests: [], other: [] },
    });
    out.blocked.push({ tc_id: tcId, file: t.file, reason });
  } else out.run.push({ tc_id: tcId, file: t.file });
}

fs.mkdirSync(path.dirname(LATEST_FILE), { recursive: true });
fs.writeFileSync(LATEST_FILE, id + "\n");
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
