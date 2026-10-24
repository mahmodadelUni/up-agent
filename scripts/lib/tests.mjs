// Parses and lints Markdown test cases (tests/*.md). Deterministic, no LLM.
import fs from "node:fs";
import path from "node:path";
import { ROOT, rel } from "./common.mjs";

const REQUIRED_META = ["id", "title", "priority", "type", "base_url", "tags"];
const PRIORITIES = ["High", "Medium", "Low"];
const TYPES = ["functional", "regression", "smoke", "negative"];
const STATE_CHANGING = /\b(delete|remove|create|add|restore|update|edit|save|submit|approve|reject|disburse|pay|archive)\b/i;

function parseScalar(v) {
  v = v.trim();
  if (/^\[.*\]$/.test(v))
    return v
      .slice(1, -1)
      .split(",")
      .map((x) => x.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  if (v === "true") return true;
  if (v === "false") return false;
  return v.replace(/^['"]|['"]$/g, "");
}

export function parseFrontMatter(text) {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: null, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = parseScalar(kv[2]);
  }
  return { meta, body: text.slice(m[0].length) };
}

export function sections(body) {
  const out = {};
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = h[1].trim().toLowerCase();
      out[current] = [];
    } else if (/^---\s*$/.test(line) || /^###\s/.test(line)) {
      current = null; // authoring rules footer etc.
    } else if (current) out[current].push(line);
  }
  return out;
}

function tableRows(lines) {
  const rows = lines.filter((l) => /^\s*\|/.test(l));
  if (rows.length < 2) return null;
  const split = (l) =>
    l
      .trim()
      .replace(/^\||\|$/g, "")
      .split(/(?<!\\)\|/)
      .map((c) => c.trim());
  const header = split(rows[0]).map((h) => h.toLowerCase());
  const body = rows.slice(1).filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l));
  return { header, rows: body.map(split) };
}

/** Parse the Steps (and optional Setup / Teardown) table into [{n, action, expected}]. */
export function parseStepTable(lines) {
  if (!lines) return { steps: [], format: "missing" };
  const t = tableRows(lines);
  if (t) {
    const ai = t.header.findIndex((h) => h.startsWith("action"));
    const ei = t.header.findIndex((h) => h.startsWith("expected"));
    return {
      format: "table",
      hasExpectedColumn: ei >= 0,
      steps: t.rows.map((r, i) => ({
        n: Number(r[0]) || i + 1,
        action: ai >= 0 ? r[ai] || "" : r[1] || "",
        expected: ei >= 0 ? r[ei] || "" : "",
      })),
    };
  }
  const items = lines.filter((l) => /^\s*(\d+[.)]|[-*])\s+/.test(l));
  return {
    format: items.length ? "list" : "missing",
    hasExpectedColumn: false,
    steps: items.map((l, i) => ({ n: i + 1, action: l.replace(/^\s*(\d+[.)]|[-*])\s+/, ""), expected: "" })),
  };
}

export function readTest(file) {
  const abs = path.resolve(ROOT, file);
  const text = fs.readFileSync(abs, "utf8");
  const { meta, body } = parseFrontMatter(text);
  const sec = sections(body);
  const steps = parseStepTable(sec["steps"]);
  return { file: rel(abs), abs, text, meta: meta || {}, hasMeta: !!meta, sec, steps };
}

export function lintTest(t) {
  const errors = [];
  const warnings = [];
  const m = t.meta;
  if (!t.hasMeta) errors.push("missing front matter (--- block at the top)");
  for (const k of REQUIRED_META)
    if (m[k] === undefined || m[k] === "" || (Array.isArray(m[k]) && !m[k].length))
      errors.push(`front matter: "${k}" is missing`);
  if (m.id && !/^TC-\d{3,5}$/.test(m.id)) errors.push(`id "${m.id}" must look like TC-001`);
  if (m.id && !path.basename(t.file).startsWith(m.id + "-") && path.basename(t.file) !== m.id + ".md")
    errors.push(`file name must start with the id (${m.id}-...)`);
  if (m.priority && !PRIORITIES.includes(m.priority))
    errors.push(`priority must be one of ${PRIORITIES.join(", ")}`);
  if (m.type && !TYPES.includes(m.type)) warnings.push(`type "${m.type}" is not one of ${TYPES.join(", ")}`);
  if (m.base_url && !/^https?:\/\/\S+$/.test(m.base_url)) errors.push("base_url must be a full http(s) URL");
  if (!t.sec["objective"]?.join("").trim()) errors.push('missing "## Objective"');
  if (!t.sec["pass criteria"] && !t.sec["acceptance criteria"]) errors.push('missing "## Pass criteria"');

  const st = t.steps;
  if (st.format === "missing" || !st.steps.length) errors.push('missing "## Steps" table');
  else {
    if (st.format === "list" || !st.hasExpectedColumn)
      errors.push('Steps must be a table with "Action" and "Expected result" columns (see templates/test-case.template.md)');
    st.steps.forEach((s) => {
      if (!s.action.trim()) errors.push(`step ${s.n}: Action is empty`);
      if (st.hasExpectedColumn && !s.expected.trim()) errors.push(`step ${s.n}: Expected result is empty`);
      if (/^(works|ok|correct(ly)?|success(ful)?)\.?$/i.test(s.expected.trim()))
        warnings.push(`step ${s.n}: Expected result "${s.expected}" is not observable; name visible text, URL or state`);
    });
    if (m.type === "smoke" && st.steps.length > 5)
      warnings.push(`smoke test has ${st.steps.length} steps; keep smoke tests short (5 or fewer)`);
    const changes = st.steps.some((s) => STATE_CHANGING.test(s.action));
    if (changes && !t.sec["teardown"])
      warnings.push('steps change data but there is no "## Teardown" section to put it back');
  }

  if (/\[CONFIRM TEXT\]/.test(t.text)) errors.push("contains [CONFIRM TEXT]: confirm the UI text before running");
  for (const v of t.text.matchAll(/env:([A-Za-z0-9_]+)/g))
    if (!/^APP_[A-Z0-9_]+$/.test(v[1])) errors.push(`env:${v[1]}: only APP_* variables can be typed by the agent`);
  if (/password\s*[:=|]\s*(?!\s*`?env:)[^\s|`][^|\n]{2,}/i.test(t.text.replace(/^.*Authoring rules[\s\S]*$/m, "")))
    warnings.push("possible inline password; use env:APP_* instead");
  return { errors, warnings };
}

// Walks folders recursively (tests/FMS-180-cases/... included). Files and folders whose
// name starts with "_" or "." are skipped (for example _coverage.md, _aio.json).
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".md") && e.name.toLowerCase() !== "readme.md") out.push(full);
  }
}

export function collectTestFiles(inputs) {
  const files = [];
  for (const input of inputs.length ? inputs : ["tests"]) {
    const abs = path.resolve(ROOT, input);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) walk(abs, files);
    else if (abs.endsWith(".md")) files.push(abs);
  }
  return [...new Set(files)].map(rel);
}

/** Read, lint and filter tests. Duplicate ids are errors on every file that shares them. */
export function selectTests(inputs, tag) {
  const all = collectTestFiles(inputs).map((f) => {
    const t = readTest(f);
    return { ...t, ...lintTest(t) };
  });
  const byId = {};
  for (const t of all) if (t.meta.id) (byId[t.meta.id] ||= []).push(t);
  for (const list of Object.values(byId))
    if (list.length > 1)
      for (const t of list) t.errors.push(`duplicate id ${t.meta.id} (also in ${list.filter((x) => x !== t).map((x) => x.file).join(", ")})`);
  const tagged = tag
    ? all.filter((t) => (Array.isArray(t.meta.tags) ? t.meta.tags : [t.meta.tags]).includes(tag) || t.meta.type === tag)
    : all;
  return tagged;
}
