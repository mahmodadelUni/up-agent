// Turns a run folder's raw data (data/*.json, bugs/*.json) into
// TC-xxx.md, SUMMARY.md, report.html, status.txt and the cross-run index.
import fs from "node:fs";
import path from "node:path";
import {
  RESULTS,
  STATUSES,
  CATEGORIES,
  SEVERITIES,
  readJson,
  writeJson,
  durationMs,
  fmtDuration,
  rel,
} from "./common.mjs";
import { renderReport } from "./report-html.mjs";
import { renderIndex } from "./index-html.mjs";

const arr = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const str = (v) => (v == null ? "" : String(v));

function normalizeStep(s, i) {
  const r = str(s.result || s.status).toUpperCase();
  return {
    n: Number(s.n) || i + 1,
    action: str(s.action),
    expected: str(s.expected),
    actual: str(s.actual),
    result: ["PASS", "FAIL", "SKIPPED", "BLOCKED"].includes(r) ? r : "SKIPPED",
    screenshot: s.screenshot ? str(s.screenshot) : null,
  };
}

function normalize(raw, planned, problems) {
  const p = planned || {};
  const t = {
    tc_id: str(raw.tc_id || p.tc_id),
    title: str(raw.title || p.title || raw.tc_id),
    file: str(raw.file || p.file),
    priority: raw.priority || p.priority || null,
    type: raw.type || p.type || null,
    tags: arr(raw.tags).length ? arr(raw.tags) : arr(p.tags),
    status: str(raw.status).toUpperCase(),
    category: raw.category || null,
    category_reason: str(raw.category_reason),
    severity: raw.severity || null,
    blocked_reason: str(raw.blocked_reason),
    environment: str(raw.environment),
    session: str(raw.session),
    started_at: raw.started_at || null,
    finished_at: raw.finished_at || null,
    suggested_bug_title: str(raw.suggested_bug_title),
    lint_warnings: arr(p.lint_warnings),
    attempts: arr(raw.attempts).map((a, i) => ({
      n: Number(a.n) || i + 1,
      status: str(a.status).toUpperCase() || "FAIL",
      failed_step: a.failed_step ?? null,
      steps: arr(a.steps).map(normalizeStep),
    })),
    observations: {
      console_errors: arr(raw.observations?.console_errors).map(str),
      failed_requests: arr(raw.observations?.failed_requests).map(str),
      other: arr(raw.observations?.other).map(str),
    },
  };
  if (!STATUSES.includes(t.status)) {
    problems.push(`${t.tc_id}: unknown status "${raw.status}", treated as BLOCKED`);
    t.blocked_reason ||= `Result file had an invalid status "${raw.status}".`;
    t.status = "BLOCKED";
  }
  if (t.category && !CATEGORIES.includes(t.category)) {
    problems.push(`${t.tc_id}: unknown category "${t.category}"`);
    t.category = null;
  }
  if (t.severity && !SEVERITIES.includes(t.severity)) t.severity = null;
  const last = t.attempts[t.attempts.length - 1];
  t.steps = last ? last.steps : [];
  t.failed_step = last?.failed_step ?? (t.steps.find((s) => s.result === "FAIL")?.n || null);
  t.duration_ms = durationMs(t.started_at, t.finished_at);
  return t;
}

export function verdictOf(totals, flakyFailsGate) {
  if (!totals.total) return { verdict: "NO TESTS", gate: "FAIL" };
  const bad = totals.FAIL + totals.BLOCKED + totals["NOT RUN"] + (flakyFailsGate ? totals.FLAKY : 0);
  if (bad) return { verdict: "FAILED", gate: "FAIL" };
  if (totals.FLAKY) return { verdict: "PASSED WITH FLAKY TESTS", gate: "PASS" };
  return { verdict: "PASSED", gate: "PASS" };
}

function loadBugs(dir) {
  const bugsDir = path.join(dir, "bugs");
  const processed = readJson(path.join(bugsDir, ".processed.json"), {}) || {};
  if (!fs.existsSync(bugsDir)) return [];
  return fs
    .readdirSync(bugsDir)
    .filter((f) => /^TC-\d{1,5}\.json$/.test(f))
    .sort()
    .map((f) => {
      const b = readJson(path.join(bugsDir, f), null);
      if (!b) return null;
      const p = processed[f] || {};
      return {
        ...b,
        jira: p.mode === "uploaded" && p.issue ? { key: p.issue, url: p.url || null } : null,
      };
    })
    .filter(Boolean);
}

const cell = (s) => str(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function testMarkdown(t, run) {
  const L = [];
  L.push(`# Result: ${t.tc_id} — ${t.title}`, "");
  L.push("| Field | Value |", "|-------|-------|");
  L.push(`| Status | ${t.status} |`);
  if (t.category) L.push(`| Cause | ${t.category}${t.category_reason ? ` — ${cell(t.category_reason)}` : ""} |`);
  L.push(`| Run | ${run.id} |`);
  L.push(`| Started | ${t.started_at || "–"} |`);
  L.push(`| Duration | ${fmtDuration(t.duration_ms)} |`);
  L.push(`| Environment | ${t.environment || run.base_url_override || "–"} |`);
  L.push(`| Attempts | ${t.attempts.length} |`);
  L.push(`| Failed step | ${t.failed_step ?? "none"} |`);
  L.push(`| Test file | \`${t.file}\` |`, "");
  if (t.status === "BLOCKED") L.push("## Blocked", "", t.blocked_reason || "No reason given.", "");
  for (const a of t.attempts) {
    L.push(`## Attempt ${a.n} — ${a.status}`, "");
    L.push("| # | Action | Expected | Actual (from snapshot) | Result |", "|---|--------|----------|------------------------|--------|");
    for (const s of a.steps)
      L.push(`| ${s.n} | ${cell(s.action)} | ${cell(s.expected)} | ${cell(s.actual) || "not executed"} | ${s.result} |`);
    const shots = a.steps.filter((s) => s.screenshot).map((s) => `\`${s.screenshot}\``);
    if (shots.length) L.push("", `Screenshots: ${shots.join(", ")}`);
    L.push("");
  }
  const o = t.observations;
  L.push("## Observations", "");
  L.push(`- **Console errors:** ${o.console_errors.length ? o.console_errors.join("; ") : "none"}`);
  L.push(`- **Failed network requests:** ${o.failed_requests.length ? o.failed_requests.join("; ") : "none"}`);
  for (const x of o.other) L.push(`- ${x}`);
  if (t.lint_warnings.length) L.push(`- **Test file warnings:** ${t.lint_warnings.join("; ")}`);
  if (t.suggested_bug_title) L.push("", "## Suggested bug title", "", t.suggested_bug_title);
  return L.join("\n") + "\n";
}

function summaryMarkdown(run, tests, bugs, totals, v) {
  const L = [];
  L.push(`# Run summary — ${run.label}`, "");
  L.push(`**Verdict: ${v.verdict}** · ${totals.PASS}/${totals.total} passed (${totals.pass_rate}%) · ${fmtDuration(run.duration_ms)}`, "");
  L.push(
    `| Total | Pass | Fail | Flaky | Blocked | Not run |`,
    `|---|---|---|---|---|---|`,
    `| ${totals.total} | ${totals.PASS} | ${totals.FAIL} | ${totals.FLAKY} | ${totals.BLOCKED} | ${totals["NOT RUN"]} |`,
    "",
  );
  L.push(`- Run id: \`${run.id}\``);
  L.push(`- Started: ${run.started_at} · Finished: ${run.finished_at || "–"}`);
  L.push(`- Trigger: ${run.trigger}${run.git?.branch ? ` · Branch: ${run.git.branch}` : ""}${run.git?.sha ? ` · Commit: ${run.git.sha.slice(0, 8)}` : ""}`);
  if (run.base_url_override) L.push(`- Environment override: ${run.base_url_override}`);
  L.push(`- Interactive report: \`report.html\``, "");
  L.push("| ID | Title | Priority | Status | Cause | Failed step | Duration | Result file |", "|---|---|---|---|---|---|---|---|");
  for (const t of tests)
    L.push(
      `| ${t.tc_id} | ${cell(t.title)} | ${t.priority || "–"} | ${t.status} | ${t.category || "–"} | ${t.failed_step ?? "–"} | ${fmtDuration(t.duration_ms)} | ${t.status === "NOT RUN" ? "–" : `${t.tc_id}.md`} |`,
    );
  const attention = tests.filter((t) => !["PASS"].includes(t.status));
  L.push("", "## Needs attention", "");
  if (!attention.length) L.push("Nothing. Every test passed.");
  for (const t of attention) {
    const why =
      t.status === "BLOCKED"
        ? t.blocked_reason
        : t.status === "NOT RUN"
          ? "No result was written for this test (the run stopped or the runner crashed)."
          : t.status === "FLAKY"
            ? "Failed once, passed on the re-run. Investigate before it becomes a real failure."
            : `Step ${t.failed_step ?? "?"} failed${t.category ? ` (${t.category})` : ""}. ${t.category_reason}`;
    L.push(`- **${t.tc_id} ${t.status}** — ${cell(why)}`);
  }
  L.push("", "## Defects", "");
  if (!bugs.length) L.push("No bug reports in this run.");
  for (const b of bugs)
    L.push(`- **${b.tc_id}** [${b.severity || "unrated"}] [${b.category || "untriaged"}] ${b.title}${b.jira ? ` — ${b.jira.url || b.jira.key}` : " — not uploaded yet"}`);
  return L.join("\n") + "\n";
}

/** Finalize (or re-render) a run folder. Returns {run, tests, bugs, totals, verdict}. */
export function finalizeRun(dir, { stampFinish = true } = {}) {
  const runFile = path.join(dir, "run.json");
  const run = readJson(runFile, null);
  if (!run) throw new Error(`${rel(dir)}/run.json is missing or invalid`);
  const problems = [];

  const planned = Object.fromEntries((run.planned || []).map((p) => [p.tc_id, p]));
  const dataDir = path.join(dir, "data");
  const seen = new Set();
  const tests = [];
  for (const f of fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => f.endsWith(".json")).sort() : []) {
    const raw = readJson(path.join(dataDir, f), null);
    const id = path.basename(f, ".json");
    if (!raw) {
      problems.push(`${f}: not valid JSON`);
      tests.push(normalize({ tc_id: id, status: "BLOCKED", blocked_reason: "The runner wrote an unreadable result file." }, planned[id], problems));
    } else tests.push(normalize(raw, planned[raw.tc_id || id], problems));
    seen.add(tests[tests.length - 1].tc_id);
  }
  for (const p of run.planned || [])
    if (!seen.has(p.tc_id)) tests.push(normalize({ tc_id: p.tc_id, status: "NOT RUN" }, p, problems));
  const order = (run.planned || []).map((p) => p.tc_id);
  tests.sort((a, b) => {
    const ia = order.indexOf(a.tc_id), ib = order.indexOf(b.tc_id);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || a.tc_id.localeCompare(b.tc_id);
  });

  const totals = { total: tests.length, PASS: 0, FAIL: 0, FLAKY: 0, BLOCKED: 0, "NOT RUN": 0 };
  for (const t of tests) totals[t.status]++;
  totals.pass_rate = totals.total ? Math.round((100 * (totals.PASS + totals.FLAKY)) / totals.total) : 0;

  if (stampFinish || !run.finished_at) run.finished_at = new Date().toISOString();
  run.duration_ms = durationMs(run.started_at, run.finished_at);
  const flakyFailsGate = String(process.env.QA_FLAKY_FAILS_GATE || "").toLowerCase() === "true";
  const v = verdictOf(totals, flakyFailsGate);
  const bugs = loadBugs(dir);

  run.totals = totals;
  run.verdict = v.verdict;
  run.gate = v.gate;
  run.problems = problems;
  run.tests = tests.map((t) => ({ tc_id: t.tc_id, title: t.title, status: t.status, priority: t.priority, category: t.category }));
  run.bugs = bugs.map((b) => ({ tc_id: b.tc_id, title: b.title, severity: b.severity || null, jira: b.jira }));
  writeJson(runFile, run);

  for (const t of tests) if (t.status !== "NOT RUN") fs.writeFileSync(path.join(dir, `${t.tc_id}.md`), testMarkdown(t, run));
  fs.writeFileSync(path.join(dir, "SUMMARY.md"), summaryMarkdown(run, tests, bugs, totals, v));
  fs.writeFileSync(path.join(dir, "status.txt"), v.gate + "\n");
  fs.writeFileSync(path.join(dir, "report.html"), renderReport({ dir, run, tests, bugs, totals, verdict: v.verdict }));
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, "index.html"), renderIndex());
  return { run, tests, bugs, totals, verdict: v.verdict, gate: v.gate, problems };
}
