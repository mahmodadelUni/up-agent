#!/usr/bin/env node
// Finishes a run: builds TC-xxx.md, SUMMARY.md, report.html and status.txt inside the
// run folder, refreshes results/index.html, and copies the gate to results/status.txt.
//
// Usage: node scripts/run-finish.mjs [results/runs/<run-id>]     (default: results/LATEST)
import fs from "node:fs";
import path from "node:path";
import { RESULTS, resolveRunDir, rel, fmtDuration } from "./lib/common.mjs";
import { finalizeRun } from "./lib/finalize.mjs";

const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dir = resolveRunDir(arg);
if (!dir) {
  console.error(`run-finish: run folder not found (${arg || "results/LATEST"})`);
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, "status.txt"), "FAIL\n");
  process.exit(2);
}

const r = finalizeRun(dir, { stampFinish: true });
fs.writeFileSync(path.join(RESULTS, "status.txt"), r.gate + "\n");

const t = r.totals;
console.log(`${r.verdict} — ${t.PASS}/${t.total} passed, ${t.FAIL} failed, ${t.FLAKY} flaky, ${t.BLOCKED} blocked, ${t["NOT RUN"]} not run (${fmtDuration(r.run.duration_ms)})`);
for (const x of r.tests.filter((x) => x.status !== "PASS"))
  console.log(`  ${x.tc_id} ${x.status}${x.failed_step ? ` at step ${x.failed_step}` : ""}${x.category ? ` [${x.category}]` : ""}`);
if (r.bugs.length) console.log(`Defects: ${r.bugs.map((b) => b.tc_id).join(", ")}`);
for (const p of r.problems) console.log(`  note: ${p}`);
console.log(`Report: ${rel(path.join(dir, "report.html"))}`);
console.log(`History: ${rel(path.join(RESULTS, "index.html"))}`);
