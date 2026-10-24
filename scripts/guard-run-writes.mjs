#!/usr/bin/env node
// PreToolUse guard for the test-runner subagent (see .claude/agents/test-runner.md).
// The runner may only create or change files inside results/runs/. Anything else
// (tests, templates, CLAUDE.md, scripts, .claude, .env files) is refused with exit 2.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let input = "";
try {
  input = fs.readFileSync(0, "utf8");
} catch {
  /* no stdin */
}
let data = {};
try {
  data = JSON.parse(input || "{}");
} catch {
  process.stderr.write("guard: could not parse hook input, refusing write\n");
  process.exit(2);
}

const ti = data.tool_input || {};
const target = ti.file_path || ti.path || ti.notebook_path;
if (!target) process.exit(0); // not a file write

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowed = path.join(root, "results", "runs") + path.sep;
const abs = path.resolve(root, String(target));

if (!abs.startsWith(allowed)) {
  process.stderr.write(
    `Refused: the test runner may only write inside results/runs/<run-id>/. ` +
      `"${path.relative(root, abs)}" is outside it. Never edit tests, templates or project files; ` +
      `report problems in the result file instead.\n`,
  );
  process.exit(2);
}
process.exit(0);
