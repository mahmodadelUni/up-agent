---
description: Upload test cases to AIO Tests — a Jira story's tests (tests/<KEY>-cases/) or specific test files/folders
argument-hint: <FMS-180 | Jira URL | issue ID | "story name" | tests/TC-006-x.md | tests/folder> [project FMS] [folder Regression/Fleet] [status Draft] [include unconfirmed] [no review]
allowed-tools: Read, Write, Glob, Bash(node scripts/lint-tests.mjs:*), Bash(node scripts/hash-tests.mjs:*), Bash(date:*)
---

Upload test cases to AIO Tests for: $ARGUMENTS

Follow `.claude/skills/aio-upload-tests/SKILL.md` exactly:

1. Resolve what to upload: a story (find `tests/<KEY>-cases/`) or the given test files/folders. Lint them.
2. Check the AIO project (default: the story's project prefix), read its field schema, tags and folders.
3. Map each test to an AIO test case and decide create, update or skip using `tests/<KEY>-cases/_aio.json`.
4. Show the preview and wait for approval, unless the arguments include "no review".
5. Create the AIO folder `<KEY>-cases` if needed, upload, and record each AIO key in `_aio.json` as you go.
6. Reply with the TC-ID → AIO key table and the counts.

If the AIO Tests MCP tools are not available, say so and stop.
