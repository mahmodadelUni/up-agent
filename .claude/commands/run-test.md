---
description: Execute one or more specific Markdown test cases in a new run folder
argument-hint: <path to test .md file(s)>
allowed-tools: Agent, Bash(node scripts/run-start.mjs:*), Bash(node scripts/run-finish.mjs:*), Read, Glob
---

Execute the test case file(s): $ARGUMENTS

1. Start the run: `node scripts/run-start.mjs --label <label> <file> [<file> ...]`, where `<label>` is the TC IDs of the files being run joined with `-` (for example `TC-002`, or `TC-001-TC-002` for two files). It prints JSON with `run_dir`, `run` and `blocked`. Use `run_dir` exactly as printed.
2. For each entry in `run`, one at a time (so a headed browser can be watched), spawn the `test-runner` subagent with:
   ```
   Test: <file>
   Run folder: <run_dir>
   ```
3. Finish the run: `node scripts/run-finish.mjs <run_dir>`.
4. Reply with the output of `run-finish.mjs` only. If a headed session was left open after a failure, add its session name.

Do not modify any test file and do not write any file yourself.
