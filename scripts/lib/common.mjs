// Shared helpers for the run scripts. No dependencies: Node 18+ only.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RESULTS = path.join(ROOT, "results");
export const RUNS = path.join(RESULTS, "runs");
export const LATEST_FILE = path.join(RESULTS, "LATEST");

export const STATUSES = ["PASS", "FAIL", "FLAKY", "BLOCKED", "NOT RUN"];
export const CATEGORIES = ["product-bug", "test-data", "environment", "test-defect"];
export const SEVERITIES = ["Critical", "High", "Medium", "Low"];

export const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function tryExec(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15000,
      shell: process.platform === "win32",
    })
      .trim()
      .split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

/** Resolve a run folder from an argument, RUN_DIR, or results/LATEST. */
export function resolveRunDir(arg) {
  const pick = arg || process.env.RUN_DIR || null;
  if (pick) {
    const direct = path.resolve(ROOT, pick);
    if (fs.existsSync(direct)) return direct;
    const byId = path.join(RUNS, pick);
    if (fs.existsSync(byId)) return byId;
    return null;
  }
  if (fs.existsSync(LATEST_FILE)) {
    const id = fs.readFileSync(LATEST_FILE, "utf8").trim();
    const dir = path.join(RUNS, id);
    if (id && fs.existsSync(dir)) return dir;
  }
  return null;
}

export function listRuns() {
  if (!fs.existsSync(RUNS)) return [];
  return fs
    .readdirSync(RUNS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(RUNS, d.name, "run.json")))
    .map((d) => d.name)
    .sort();
}

export function durationMs(a, b) {
  const s = Date.parse(a);
  const e = Date.parse(b);
  return Number.isFinite(s) && Number.isFinite(e) && e >= s ? e - s : null;
}

export function fmtDuration(ms) {
  if (ms == null) return "–";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function localStamp(d = new Date()) {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_` +
    `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

export function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
