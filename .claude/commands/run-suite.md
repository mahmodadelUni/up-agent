---
description: Run a whole folder of Markdown test cases in a new run folder, one subagent per test
argument-hint: <folder, e.g. tests/> [tag filter, e.g. smoke]
allowed-tools: Agent, Bash(node scripts/run-start.mjs:*), Bash(node scripts/run-finish.mjs:*), Read, Glob
---

Run the suite at: $ARGUMENTS

1. Start the run. The first argument is the folder; a second argument, if given, is the tag.
   - With a tag: `node scripts/run-start.mjs --label <tag> --tag <tag> <folder>`
   - Without: `node scripts/run-start.mjs --label full <folder>`

   It prints JSON with `run_dir`, `run` (tests to execute) and `blocked` (tests the linter rejected; they are already recorded as BLOCKED). Use `run_dir` exactly as printed.
2. For each entry in `run`, spawn the `test-runner` subagent with this prompt:
   ```
   Test: <file>
   Run folder: <run_dir>
   ```
   Run at most 3 in parallel. Tests are assumed independent. If a test's Notes say it depends on another, run it after its dependency.
3. Wait for every subagent's one-line result. Do not retry failures yourself; the runner does its own single re-run.
4. Finish the run: `node scripts/run-finish.mjs <run_dir>`. It writes `SUMMARY.md`, `report.html`, `status.txt` and the per-test Markdown files, and updates `results/index.html`.
5. Reply with the output of `run-finish.mjs` only.

Do not write any file yourself. The runner writes results, the scripts write summaries.
