---
description: Draft new Markdown test case(s) from a requirement, user story or Jira key
argument-hint: <requirement / acceptance criteria / Jira key such as FMS-123>
allowed-tools: Read, Write, Glob, Bash(node scripts/lint-tests.mjs:*)
---

Turn this requirement into test case file(s): $ARGUMENTS

Strategy first, files second:

0. If the argument is a Jira key, Jira URL, epic or JQL, stop here and follow `.claude/skills/jira-story-to-tests/SKILL.md` instead (same as `/tests-from-jira`).
1. In 3-6 lines, state the test design approach: which techniques apply (equivalence partitioning, boundary values, decision table, state transition, negative paths) and what is deliberately out of scope.
2. Glob `tests/` to find the next free `TC-###` IDs. Do not overwrite existing files.
3. Create one file per scenario in `tests/` as `TC-###-<kebab-title>.md`, strictly following `templates/test-case.template.md`.
4. Rules for every test:
   - Steps are a table: `| # | Action | Expected result |`. One action and one observable expectation per row.
   - Quote exact UI text and error messages from the requirement. If the requirement does not give exact text, write `[CONFIRM TEXT]` instead of inventing it (the linter will hold the test back until it is confirmed).
   - Secrets as `env:APP_*` only.
   - Tests that create, change or delete data get a `## Setup` that creates or checks the data they need and a `## Teardown` that puts the data back.
   - `smoke` tests are 5 steps or fewer. Longer flows are `functional` or `regression`.
   - Mark anything ambiguous in Notes as `OPEN QUESTION:`.
5. Run `node scripts/lint-tests.mjs <the new files>`. Fix every error except `[CONFIRM TEXT]`.
6. Reply with a table: ID | Title | Type | Technique | Open questions, plus any lint warnings.
