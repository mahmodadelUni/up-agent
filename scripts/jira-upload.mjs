#!/usr/bin/env node
// Uploads bug reports written by the QA agent (results/runs/<run-id>/bugs/TC-*.json) to Jira Cloud.
//
// Which run: --run <folder or run-id>, else env RUN_DIR, else the run named in results/LATEST.
// Every final FAIL has a report. Its triage category becomes a Jira label (triage-<category>)
// and the agent's reason is shown at the top of the ticket.
// JIRA_UPLOAD_CATEGORIES (optional) limits which categories are uploaded, comma-separated,
// for example "product-bug". Default: all four categories.
//
// - Fills the team bug template (Test Data / Steps / Expected / Actual).
// - Never posts the password. Masks known secret values anywhere in the text.
// - De-duplicates: if an open bug labelled "qa-agent" + "<TC-ID>" exists, it adds a
//   comment to that bug instead of creating a new one.
// - Attaches the screenshots listed in the report (only from the run's screenshots/ folder).
// - DRY RUN BY DEFAULT: prints what it would create. Set JIRA_DRY_RUN=false to upload.
//
// Required for real uploads (set them in .env.jira):
//   JIRA_BASE_URL       e.g. https://your-site.atlassian.net
//   JIRA_EMAIL          the Atlassian account that owns the API token
//   JIRA_API_TOKEN      API token for that account
//   JIRA_PROJECT_KEY    e.g. FMS
//   JIRA_PROJECT_ID     e.g. 10390
//   JIRA_ISSUE_TYPE_ID  e.g. 10573
// Optional:
//   JIRA_DRY_RUN        "false" to upload (anything else = dry run)
//   APP_EMAIL           shown on the template's email line
//   APP_*PASS*          password values, used only to mask them if they appear in the text
//   GIT_SHA, BASE_URL   added to the footer for traceability
//
// Local settings: if a file named .env.jira exists in the project root, its KEY=VALUE
// lines are loaded (variables already set in the environment win).
//
// --hook mode (used by the Claude Code Stop hook in .claude/settings.json):
//   - runs automatically each time the agent finishes a turn, on your machine
//   - uploads each new or changed report of the latest run once (tracked in <run>/bugs/.processed.json)
//   - always exits 0 so it never interrupts the agent; prints a one-line status for you
//
// Exit codes (normal mode): 0 ok, 1 some reports failed validation or upload, 2 configuration error.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { resolveRunDir, rel, SEVERITIES, ROOT } from "./lib/common.mjs";
import { finalizeRun } from "./lib/finalize.mjs";

const HOOK_MODE = process.argv.includes("--hook");
process.chdir(ROOT); // .env, .env.jira and results/ are relative to the project root

// Load .env.jira (all keys) and .env (APP_* only: the email for the template, the
// password so it can be masked) without overriding variables that are already set.
for (const [file, keep] of [
  [".env.jira", () => true],
  [".env", (k) => k.startsWith("APP_")],
]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#") || !keep(m[1])) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined || process.env[m[1]] === "")
      process.env[m[1]] = value;
  }
}

const env = process.env;
const DRY_RUN = (env.JIRA_DRY_RUN ?? "true").trim().toLowerCase() !== "false";
const runArgIdx = process.argv.indexOf("--run");
const RUN_DIR = resolveRunDir(runArgIdx >= 0 ? process.argv[runArgIdx + 1] : null);
if (!RUN_DIR) {
  if (!HOOK_MODE) process.stderr.write("jira-upload: no run folder found (use --run results/runs/<run-id>)\n");
  process.exit(HOOK_MODE ? 0 : 2);
}
const BUGS_DIR = path.join(RUN_DIR, "bugs");
const SHOT_DIR = path.join(RUN_DIR, "screenshots");
const AGENT_LABEL = "qa-agent";
const PASSWORD_TEXT = "Stored in the QA secrets vault (not posted to Jira)";
const MAX_SHOTS = 5;
const MAX_SHOT_BYTES = 10 * 1024 * 1024;
const ALLOWED_KEYS = [
  "tc_id",
  "title",
  "link",
  "steps",
  "expected",
  "actual",
  "screenshots",
  "observations",
  "category",
  "category_reason",
  "severity",
];
const CATEGORIES = ["product-bug", "test-data", "environment", "test-defect"];
const UPLOAD_CATEGORIES = (process.env.JIRA_UPLOAD_CATEGORIES || CATEGORIES.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ---------- text safety ----------

// Every password-like APP_* value (APP_PASS, APP_INSPECTOR_PASS, ...) plus the Jira token.
const secretValues = [
  ...Object.keys(env)
    .filter((k) => /^APP_.*(PASS|SECRET|TOKEN|KEY)/.test(k))
    .map((k) => env[k]),
  env.JIRA_API_TOKEN,
].filter((v) => v && v.length >= 4);
const redact = (s) =>
  secretValues.reduce((text, v) => text.split(v).join("***"), String(s));

// Escape Jira wiki markup characters in free text and keep it on one line.
const esc = (s) =>
  redact(s)
    .replace(/\s*\r?\n\s*/g, " ")
    .replace(/([*_{}\[\]|!^~+-])/g, "\\$1")
    .trim();

// ---------- validation ----------

function realShotPath(p) {
  // Paths are relative to the run folder ("screenshots/TC-001-step3.png"); project-relative paths also work.
  const abs = [path.resolve(RUN_DIR, String(p)), path.resolve(String(p))].find((x) => fs.existsSync(x));
  if (!abs) return { error: `screenshot missing: ${p}` };
  const real = fs.realpathSync(abs);
  const shotRoot = fs.existsSync(SHOT_DIR)
    ? fs.realpathSync(SHOT_DIR)
    : SHOT_DIR;
  if (!real.startsWith(shotRoot + path.sep))
    return { error: `screenshot outside this run's screenshots folder: ${p}` };
  if (!/\.(png|jpe?g)$/i.test(real))
    return { error: `screenshot must be .png or .jpg: ${p}` };
  if (fs.statSync(real).size > MAX_SHOT_BYTES)
    return { error: `screenshot larger than 10 MB: ${p}` };
  return { path: real };
}

function validate(report, fileName) {
  const errors = [];
  if (report === null || typeof report !== "object" || Array.isArray(report))
    return { errors: ["file is not a JSON object"] };

  for (const k of Object.keys(report))
    if (!ALLOWED_KEYS.includes(k)) errors.push(`unexpected key "${k}"`);

  if (!CATEGORIES.includes(report.category))
    errors.push(`category must be one of ${CATEGORIES.join(", ")}`);
  else if (!UPLOAD_CATEGORIES.includes(report.category))
    errors.push(`category "${report.category}" is not in JIRA_UPLOAD_CATEGORIES (${UPLOAD_CATEGORIES.join(", ")})`);
  if (report.category_reason !== undefined && typeof report.category_reason !== "string")
    errors.push("category_reason must be a string");
  if (report.severity !== undefined && !SEVERITIES.includes(report.severity))
    errors.push(`severity must be one of ${SEVERITIES.join(", ")}`);

  if (!/^TC-\d{1,5}$/.test(report.tc_id ?? ""))
    errors.push("tc_id must look like TC-001");
  else if (path.basename(fileName, ".json") !== report.tc_id)
    errors.push("file name must match tc_id");

  const text = (key, max, optional = false) => {
    const v = report[key];
    if (v === undefined && optional) return;
    if (typeof v !== "string" || !v.trim())
      errors.push(`${key} is missing or empty`);
    else if (v.length > max)
      errors.push(`${key} is longer than ${max} characters`);
  };
  text("title", 100);
  text("expected", 2000);
  text("actual", 4000);
  text("observations", 2000, true);

  if (
    typeof report.link !== "string" ||
    !/^https:\/\/[^\s\[\]{}|<>"']+$/.test(report.link)
  ) {
    errors.push("link must be a plain https:// URL");
  }

  const steps = report.steps;
  if (
    !Array.isArray(steps) ||
    steps.length < 1 ||
    steps.length > 30 ||
    steps.some((s) => typeof s !== "string" || !s.trim() || s.length > 500)
  ) {
    errors.push(
      "steps must be 1 to 30 non-empty strings of up to 500 characters",
    );
  }

  const shots = [];
  const list = report.screenshots ?? [];
  if (!Array.isArray(list) || list.length > MAX_SHOTS) {
    errors.push(`screenshots must be a list of at most ${MAX_SHOTS} paths`);
  } else {
    for (const p of list) {
      const r = realShotPath(p);
      if (r.error) errors.push(r.error);
      else shots.push(r.path);
    }
  }
  return { errors, shots };
}

// ---------- Jira content ----------

function buildSummary(report) {
  return redact(`[${report.tc_id}] ${report.title}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250);
}

function buildDescription(report) {
  const footer = [
    "----",
    `_Reported automatically by the QA agent for ${report.tc_id} (run ${path.basename(RUN_DIR)})._`,
    env.GIT_SHA ? `Commit: ${env.GIT_SHA}` : null,
    env.BASE_URL ? `Environment: ${env.BASE_URL}` : null,
    report.observations ? `Observations: ${esc(report.observations)}` : null,
  ].filter(Boolean);

  return [
    `* Agent triage: ${esc(CAUSE_LABEL[report.category] || report.category)}${report.category_reason ? ` — ${esc(report.category_reason)}` : ""}`,
    ...(report.severity ? [`* Proposed severity: ${esc(report.severity)}`] : []),
    "* Test Data:",
    `** link: [${report.link}]`,
    `** email: ${env.APP_EMAIL ? esc(env.APP_EMAIL) : "QA test account"}`,
    `** password: ${PASSWORD_TEXT}`,
    "* Steps to reproduce:",
    ...report.steps.map((s, i) => `** ${i + 1}. ${esc(s)}`),
    `* Expected result: ${esc(report.expected)}`,
    `* Actual result: ${esc(report.actual)}`,
    "",
    ...footer,
  ].join("\n");
}

const CAUSE_LABEL = {
  "product-bug": "Product defect",
  "test-data": "Test data problem (not an app defect)",
  environment: "Environment problem (not an app defect)",
  "test-defect": "Test case problem (not an app defect)",
};

function buildRecurrenceComment(report) {
  return [
    "Failed again in an automated run.",
    env.GIT_SHA ? `Commit: ${env.GIT_SHA}` : null,
    `Actual result: ${esc(report.actual)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- Jira API ----------

function jiraBase() {
  let base = (env.JIRA_BASE_URL || "").trim().replace(/\/+$/, "");
  if (/^http:\/\/[^/]+\.atlassian\.net$/i.test(base))
    base = base.replace(/^http:/i, "https:");
  return base;
}

async function jira(method, apiPath, body, extraHeaders = {}) {
  const headers = {
    Authorization:
      "Basic " +
      Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64"),
    Accept: "application/json",
    ...extraHeaders,
  };
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(jiraBase() + apiPath, {
    method,
    headers,
    body: payload,
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(
      `${method} ${apiPath} returned ${res.status}: ${redact(text).slice(0, 800)}`,
    );
  return text ? JSON.parse(text) : {};
}

async function findOpenBug(tcId) {
  const jql =
    `project = ${env.JIRA_PROJECT_KEY} AND labels = "${AGENT_LABEL}" AND labels = "${tcId}" ` +
    `AND statusCategory != Done ORDER BY created DESC`;
  const q = new URLSearchParams({ jql, fields: "key", maxResults: "1" });
  const data = await jira("GET", `/rest/api/3/search/jql?${q}`);
  return data.issues?.[0]?.key ?? null;
}

async function createBug(report) {
  const created = await jira("POST", "/rest/api/2/issue", {
    fields: {
      project: { id: String(env.JIRA_PROJECT_ID) },
      issuetype: { id: String(env.JIRA_ISSUE_TYPE_ID) },
      summary: buildSummary(report),
      description: buildDescription(report),
      labels: [AGENT_LABEL, report.tc_id, `triage-${report.category}`],
    },
  });
  return created.key;
}

async function attach(issueKey, filePath) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([fs.readFileSync(filePath)]),
    path.basename(filePath),
  );
  await jira("POST", `/rest/api/3/issue/${issueKey}/attachments`, form, {
    "X-Atlassian-Token": "no-check",
  });
}

// ---------- main ----------

function checkConfig() {
  const missing = [
    "JIRA_BASE_URL",
    "JIRA_EMAIL",
    "JIRA_API_TOKEN",
    "JIRA_PROJECT_KEY",
    "JIRA_PROJECT_ID",
    "JIRA_ISSUE_TYPE_ID",
  ].filter((k) => !env[k] || !env[k].trim());
  const problems = missing.map((k) => `${k} is not set`);
  if (env.JIRA_PROJECT_KEY && !/^[A-Z][A-Z0-9_]+$/.test(env.JIRA_PROJECT_KEY))
    problems.push("JIRA_PROJECT_KEY looks invalid");
  if (env.JIRA_BASE_URL && !/^https?:\/\//.test(env.JIRA_BASE_URL))
    problems.push("JIRA_BASE_URL must start with https://");
  return problems;
}

// ---------- processed-state (so each report is handled once) ----------

const STATE_FILE = path.join(BUGS_DIR, ".processed.json");
const loadState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
};
const saveState = (state) => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    /* best effort */
  }
};
const hashOf = (text) => crypto.createHash("sha256").update(text).digest("hex");

async function main() {
  const out = [
    `## Jira bug reports — ${path.basename(RUN_DIR)}${DRY_RUN ? " (dry run: nothing was uploaded)" : ""}`,
    "",
  ];
  const notes = []; // one-line status messages for hook mode
  const finish = (code) => {
    const text = out.join("\n") + "\n";
    try {
      fs.mkdirSync(BUGS_DIR, { recursive: true });
      fs.writeFileSync(path.join(BUGS_DIR, "jira-report.md"), text);
    } catch {
      /* reporting is best effort */
    }
    if (HOOK_MODE) {
      if (notes.length)
        process.stdout.write(
          JSON.stringify({ systemMessage: `Jira: ${notes.join(" | ")}` }) +
            "\n",
        );
      return 0; // never interrupt the agent
    }
    process.stdout.write(text);
    return code;
  };

  const allFiles = fs.existsSync(BUGS_DIR)
    ? fs
        .readdirSync(BUGS_DIR)
        .filter((f) => /^TC-\d{1,5}\.json$/.test(f))
        .sort()
    : [];

  // Skip reports already handled in the same mode with the same content.
  const state = loadState();
  const mode = DRY_RUN ? "dry-run" : "uploaded";
  const pending = [];
  for (const file of allFiles) {
    const raw = fs.readFileSync(path.join(BUGS_DIR, file), "utf8");
    const hash = hashOf(raw);
    if (state[file]?.hash === hash && state[file]?.mode === mode) continue;
    pending.push({ file, raw, hash });
  }

  if (pending.length === 0) {
    out.push(
      allFiles.length
        ? "No new bug reports since the last upload."
        : "No failed tests produced a bug report.",
    );
    return finish(0);
  }

  if (!DRY_RUN) {
    const problems = checkConfig();
    if (problems.length) {
      out.push(
        "Configuration error, nothing uploaded:",
        ...problems.map((p) => `- ${p}`),
      );
      notes.push(`not uploaded, configuration error (${problems.join("; ")})`);
      return finish(2);
    }
  }

  let failures = 0;
  for (const { file, raw, hash } of pending) {
    let report;
    try {
      report = JSON.parse(raw);
    } catch {
      failures++;
      out.push(`- **${file}**: skipped, not valid JSON`);
      notes.push(`${file} skipped (not valid JSON)`);
      continue;
    }

    const { errors, shots } = validate(report, file);
    if (errors.length) {
      failures++;
      out.push(
        `- **${file}**: skipped, invalid report:`,
        ...errors.map((e) => `  - ${e}`),
      );
      notes.push(`${file} skipped (invalid: ${errors[0]})`);
      continue;
    }

    if (DRY_RUN) {
      out.push(
        `### ${buildSummary(report)}`,
        "",
        `Labels: ${AGENT_LABEL}, ${report.tc_id}, triage-${report.category}`,
        `Attachments: ${shots.map((s) => path.basename(s)).join(", ") || "none"}`,
        "",
        "```text",
        buildDescription(report),
        "```",
        "",
      );
      notes.push(
        `${report.tc_id} dry run, preview in ${rel(path.join(BUGS_DIR, "jira-report.md"))} (set JIRA_DRY_RUN=false to upload)`,
      );
      state[file] = { hash, mode, at: new Date().toISOString() };
      continue;
    }

    try {
      const existing = await findOpenBug(report.tc_id);
      if (existing) {
        await jira("POST", `/rest/api/2/issue/${existing}/comment`, {
          body: buildRecurrenceComment(report),
        });
        out.push(
          `- **${report.tc_id}**: open bug already exists, added a comment to ${jiraBase()}/browse/${existing}`,
        );
        notes.push(
          `${report.tc_id} commented on existing ${jiraBase()}/browse/${existing}`,
        );
        state[file] = {
          hash,
          mode,
          issue: existing,
          url: `${jiraBase()}/browse/${existing}`,
          at: new Date().toISOString(),
        };
      } else {
        const key = await createBug(report);
        let attached = 0;
        for (const s of shots) {
          try {
            await attach(key, s);
            attached++;
          } catch (e) {
            out.push(`  - attachment ${path.basename(s)} failed: ${e.message}`);
          }
        }
        out.push(
          `- **${report.tc_id}**: created ${jiraBase()}/browse/${key} (${attached}/${shots.length} screenshots attached)`,
        );
        notes.push(`${report.tc_id} created ${jiraBase()}/browse/${key}`);
        state[file] = { hash, mode, issue: key, url: `${jiraBase()}/browse/${key}`, at: new Date().toISOString() };
      }
    } catch (e) {
      failures++; // not recorded in state, so it is retried next time
      out.push(`- **${report.tc_id}**: upload failed: ${e.message}`);
      notes.push(`${report.tc_id} upload failed: ${e.message.slice(0, 200)}`);
    }
  }
  saveState(state);
  // Put the Jira links into the run's report.html and SUMMARY.md.
  if (!DRY_RUN && fs.existsSync(path.join(RUN_DIR, "run.json"))) {
    try {
      finalizeRun(RUN_DIR, { stampFinish: false });
    } catch (e) {
      out.push(`- report not refreshed: ${e.message}`);
    }
  }
  return finish(failures ? 1 : 0);
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(redact(`jira-upload crashed: ${e.stack || e}`) + "\n");
    process.exit(HOOK_MODE ? 0 : 1);
  });
