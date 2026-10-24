#!/usr/bin/env node
// Prints the sha256 of each test file, used by the aio-upload-tests skill to tell
// whether a test changed since its last upload (compared with <folder>/_aio.json).
//
// Usage: node scripts/hash-tests.mjs tests/FMS-180-cases
// Output: JSON { "tests/FMS-180-cases/TC-031-add-vehicle.md": "<sha256>", ... }
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { ROOT } from "./lib/common.mjs";
import { collectTestFiles } from "./lib/tests.mjs";

const files = collectTestFiles(process.argv.slice(2));
const out = {};
for (const f of files) {
  // Normalise line endings so Windows, macOS and Linux machines give the same hash.
  const text = fs.readFileSync(path.resolve(ROOT, f), "utf8").replace(/\r\n/g, "\n");
  out[f] = crypto.createHash("sha256").update(text).digest("hex");
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
