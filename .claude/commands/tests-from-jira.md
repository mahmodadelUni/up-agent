---
description: Create test cases from Jira user stories (key, URL, epic, sprint or JQL) via the Atlassian MCP
argument-hint: <FMS-180 | Jira URL | issue ID | "story name" | epic FMS-100 | JQL> [base URL] [tag] [no review] [comment on Jira]
allowed-tools: Read, Write, Glob, Bash(node scripts/lint-tests.mjs:*)
---

Create test cases for: $ARGUMENTS

Follow `.claude/skills/jira-story-to-tests/SKILL.md` exactly:

1. Read the story (or stories) with the Atlassian MCP tools.
2. Show the coverage plan and wait for approval, unless the arguments include "no review".
3. Write the test files in `tests/<KEY>-cases/` (for example `tests/FMS-180-cases/`) from `templates/test-case.template.md`, plus `tests/<KEY>-cases/_coverage.md`.
4. Lint them with `node scripts/lint-tests.mjs` and fix errors (except `[CONFIRM TEXT]`).
5. Reply with the test table, coverage gaps, open questions, and the next commands: `/run-suite tests/<KEY>-cases` and `/upload-to-aio <KEY>`.

If no Atlassian MCP tools are available, say so and stop. Do not guess the story content.
