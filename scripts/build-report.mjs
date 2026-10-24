#!/usr/bin/env node
// Re-renders a run's SUMMARY.md, TC-xxx.md and report.html (for example after Jira
// upload added issue links) without changing its finish time or the status.txt verdict file.
//
// Usage: node scripts/build-report.mjs [results/runs/<run-id> | <run-id> | --latest | --all] [--quiet]
import path from "node:path";
import { RUNS, resolveRunDir, listRuns, rel } from "./lib/common.mjs";
import { finalizeRun } from "./lib/finalize.mjs";

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const arg = args.find((a) => !a.startsWith("--"));
const dirs = args.includes("--all") ? listRuns().map((id) => path.join(RUNS, id)) : [resolveRunDir(arg)].filter(Boolean);

if (!dirs.length) {
  if (!quiet) console.error("build-report: no run folder found");
  process.exit(quiet ? 0 : 2);
}
for (const d of dirs) {
  try {
    finalizeRun(d, { stampFinish: false });
    if (!quiet) console.log(`Rebuilt ${rel(path.join(d, "report.html"))}`);
  } catch (e) {
    if (!quiet) console.error(`build-report: ${rel(d)}: ${e.message}`);
  }
}
