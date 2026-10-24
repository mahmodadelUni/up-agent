# UP Agent

An AI QA agent built on Claude Code. You write test cases in plain Markdown, or have the agent write them from a Jira story. The agent runs them in a real browser, checks every step against its expected result, and gives you a shareable HTML report with screenshot evidence. It also writes Jira bug reports for failures and syncs test cases to AIO Tests.

Everything runs locally from Claude Code on your machine.

## Benefits

- **Readable tests.** Each test is a Markdown table of actions and expected results, so anyone on the team can write or review one.
- **Jira story to test cases in minutes.** The agent reads the acceptance criteria, applies test design techniques, and shows you a coverage plan before writing anything.
- **Evidence for every verdict.** Every step is checked against what the page shows and gets its own screenshot.
- **Triaged failures.** Each failure is labelled `product-bug`, `test-data`, `environment` or `test-defect`, with a reason.
- **Fewer false alarms.** A failed test is re-run once. If it passes the second time, it's marked FLAKY instead of FAIL.
- **One-file reports.** Each run produces a self-contained `report.html` that you can email or attach to a ticket.
- **Jira and AIO Tests integration.** Bug reports go to Jira without duplicates, and test cases sync to AIO linked to their story.
- **A path to scripted tests.** Stable tests can be converted into Playwright specs that run fast and cost no tokens.
- **Secure by default.** Passwords never reach the AI, and the test runner can write only inside its own run folder.

---

## Setup

Do this once per machine. On Windows, run all commands in **Git Bash**.

**MCP servers:** each person connects their own in Claude Code. You need the **Atlassian MCP** for `/tests-from-jira` and the **AIO Tests MCP** for `/upload-to-aio`. Type `/mcp` in Claude to check that both are connected. Every other command works without them.

### 1. Install the tools

Install [Node.js 20+](https://nodejs.org) and [Git](https://git-scm.com), then run:

```bash
npm i -g @anthropic-ai/claude-code @playwright/cli@0.1.22
playwright-cli install-browser
claude        # log in on first start, then type /exit
```

**Check:** `claude --version` and `playwright-cli --version` both print a version.

### 2. Clone the project and open it in VS Code

```bash
git clone https://github.com/mahmodadelUni/up-agent.git
cd up-agent
npm install
code .
```

`code .` opens the project folder in VS Code. Run every later command in VS Code's terminal (**Terminal → New Terminal**), which starts in the project folder.

If you see `code: command not found` on macOS, open VS Code, press `Cmd+Shift+P`, run **Shell Command: Install 'code' command in PATH**, and try again. On Windows the command is set up when VS Code is installed.

### 3. Create `.env` (test accounts)

In VS Code, create a file named `.env` in the project root (next to `README.md`), paste the lines below, and replace the values with your test-environment accounts:

```ini
APP_EMAIL=admin@example.com
APP_EMAIL_VALID=admin@example.com
APP_PASS=change-me
APP_INSPECTOR_EMAIL=inspector@example.com
APP_INSPECTOR_PASS=change-me
```

`.env` is gitignored, so it never gets pushed. The agent itself never reads it.

### 4. Create `.env.jira` (optional: Jira bug uploads)

Skip this step if you don't want failed tests reported to Jira automatically. Otherwise, create `.env.jira` in the project root:

```ini
JIRA_BASE_URL=https://your-site.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=paste-your-api-token
JIRA_PROJECT_KEY=FMS
JIRA_PROJECT_ID=10000
JIRA_ISSUE_TYPE_ID=10001
JIRA_DRY_RUN=true
```

- Create the token at [id.atlassian.com → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
- `JIRA_DRY_RUN=true` only previews the bugs in `bugs/jira-report.md`. Set it to `false` when you want them uploaded.
- Optional: add `JIRA_UPLOAD_CATEGORIES=product-bug` to upload only app defects.

### 5. Add your test cases and run them

Test cases aren't stored in the repository. Each person keeps their own in a `tests/` folder in the project root.

1. Create the `tests/` folder next to `README.md`.
2. Put your test cases in it as `.md` files. You can get them in three ways:
   - **From a Jira story:** in Claude, run `/tests-from-jira <story-id>`. The tests are written to `tests/<story-id>-cases/`.
   - **From requirement text:** in Claude, run `/new-test <paste the acceptance criteria>`.
   - **By hand:** copy `templates/test-case.template.md` into `tests/`, rename it like `TC-001-login.md`, and fill it in (see [Writing a test case](#writing-a-test-case)).
3. Check your test files. This opens no browser:
   ```bash
   npm run lint
   ```
4. Start Claude with the browser visible and run one test:
   ```bash
   HEADED=1 claude
   ```
   ```
   /run-test tests/<your-test-file>.md
   ```

**Check:** the run prints its result, and `results/runs/<newest>/report.html` opens in your browser.

---

## Daily workflow

```bash
claude                         # or: HEADED=1 claude to watch the browser
```

1. `/tests-from-jira <story-id>`: review the coverage plan, approve it, and the tests are written to `tests/<story-id>-cases/`.
2. Replace every `[CONFIRM TEXT]` placeholder with the real UI text. The linter holds those tests back until you do.
3. `/run-suite tests/<story-id>-cases`: runs the tests and produces the report.
4. `/upload-to-aio <story-id>`: syncs the tests to AIO Tests.

## Commands

| Command | What it does |
|---------|--------------|
| `/tests-from-jira <story>` | Writes test cases from a Jira story. Accepts a key, URL, issue ID, story name, `epic FMS-100` or JQL. |
| `/new-test <requirement text>` | Writes test cases from pasted requirements instead of Jira. |
| `/run-test <file(s)>` | Runs specific tests one at a time, so you can watch them. |
| `/run-suite <folder> [tag]` | Runs a folder of tests, up to 3 in parallel. Example: `/run-suite tests/ smoke` |
| `/upload-to-aio <story or files>` | Creates or updates AIO test cases linked to the story. |
| `/graduate-test <file>` | Converts a test that passed its last 3 runs into a Playwright spec in `e2e/`. |

Add these words to a command to change its behaviour:

| Word | Command | Effect |
|------|---------|--------|
| `no review` | `/tests-from-jira`, `/upload-to-aio` | Skips the approval step |
| `comment on Jira` | `/tests-from-jira` | Posts the test list to the story (you see it first) |
| `project <KEY>` | `/upload-to-aio` | AIO project to upload into (default: the story's prefix) |
| `folder <path>` | `/upload-to-aio` | Parent AIO folder (default: root) |
| `status <name>` | `/upload-to-aio` | AIO status for new cases (default: `Draft`) |
| `include unconfirmed` | `/upload-to-aio` | Also uploads tests that still have `[CONFIRM TEXT]` |

## npm scripts

| Script | What it does |
|--------|--------------|
| `npm run lint` | Lints all tests. Add `-- --tag smoke` to lint only one tag. |
| `npm run report` | Re-renders the latest run's report. Add `-- --all` for every run. |
| `npm run jira:upload` | Uploads the latest run's bug reports to Jira. Add `-- --run <run-id>` for an older run. |
| `npm run e2e` | Runs the graduated Playwright specs in `e2e/`. |

---

## Skills

Skills are instructions that Claude loads automatically when a task needs them. The commands above use them, and so do plain requests like "write test cases for <story-id>".

### `jira-story-to-tests`: Jira story → test cases

- **Used by:** `/tests-from-jira`, or `/new-test` when you give it a Jira key
- **Needs:** the Atlassian MCP
- **What it does:**
  1. Reads the story, its acceptance criteria and comments, the parent epic, and linked Confluence specs. It never edits Jira.
  2. Lists every testable condition (`AC1`, `BR1`, …) and flags gaps as open questions.
  3. Shows a coverage plan (equivalence partitioning, boundaries, decision tables, state transitions, negative paths) and waits for your approval.
  4. Writes the tests to `tests/<KEY>-cases/` with a traceability table in `_coverage.md`, then lints them.
- **Run it again** after the story changes: it proposes updates instead of creating duplicates.

### `aio-upload-tests`: test cases → AIO Tests

- **Used by:** `/upload-to-aio`
- **Needs:** the AIO Tests MCP
- **What it does:**
  1. Lints the story's tests and skips any that have errors or `[CONFIRM TEXT]`.
  2. Maps each test to an AIO test case: steps, expected results, priority, tags, and a requirement link to the story.
  3. Shows a preview of what it will create, update or skip, and waits for your approval.
  4. Uploads into the AIO folder `<KEY>-cases` and records each AIO key in `_aio.json`.
- **Run it again** after editing tests: it updates the same AIO cases and skips unchanged ones. It never deletes anything in AIO.

### `bug-report`: failed test → bug report

- **Used by:** the test runner, automatically, for every test that fails on both attempts
- **What it does:** writes `bugs/<TC-ID>.json` in the run folder. The file has the title, severity, steps to reproduce, expected and actual results, screenshots, and the triage category.
- **Then:** after each Claude turn, `scripts/jira-upload.mjs` turns these files into Jira bugs. Each bug uses your template, gets labels (`qa-agent`, `<TC-ID>`, `triage-<category>`) and has its screenshots attached. If an open bug already exists for the test, the script adds a comment to it instead of creating a new one.

### `playwright-cli`: browser commands

- **Used by:** the test runner, whenever it drives the browser
- **What it is:** the command reference for `playwright-cli`, which the agent treats as the source of truth for syntax. It's installed by `playwright-cli` itself, so don't edit it.

### `test-runner` subagent

`/run-test` and `/run-suite` start one runner per test. Each runner follows the rules in `CLAUDE.md`: act, check, screenshot, stop at the first failure, run Teardown, re-run once on failure, triage, and save the result as JSON.

---

## Writing a test case

Copy `templates/test-case.template.md`. A minimal test looks like this:

```markdown
---
id: TC-020
title: Report cannot be submitted with empty required fields
priority: High
type: negative
base_url: https://uatfleet.noor.city
tags: [reports, smoke]
requires_auth: true
jira: <story-id>
---

## Objective
Required fields are validated before a report is submitted.

## Preconditions
- Inspector account in `APP_INSPECTOR_EMAIL` / `APP_INSPECTOR_PASS`

## Steps
| # | Action | Expected result |
| - | ------ | --------------- |
| 1 | Sign in with env:APP_INSPECTOR_EMAIL / env:APP_INSPECTOR_PASS | Heading "My Reports" is visible |
| 2 | Click "Submit" without filling any field | Error "Title is required" is shown |

## Pass criteria
All expected results match their snapshots. Any mismatch = FAIL.
```

Rules for stable tests:

- Each row has one action and one expected result that can be seen on the page. Write `Toast "Saved" appears`, not "it works".
- Put exact UI text in `"double quotes"`.
- Write credentials only as `env:APP_*`. A new role needs a new `APP_*` variable in `.env`. Add it to the `.env` list in setup step 3 too, so the team knows about it.
- A test that changes data needs a `## Setup` and a `## Teardown`.
- `type` is one of `functional`, `regression`, `smoke` or `negative`. Smoke tests have 5 steps or fewer.

---

## Results and reports

Every run gets its own folder (`results/` is gitignored):

```
results/
  index.html            history of all runs: trend chart and per-test stability grid
  status.txt            PASS or FAIL for the latest run
  runs/<date>_<label>/
    report.html         interactive report with embedded screenshots (share this file)
    SUMMARY.md          plain-text summary
    data/ screenshots/  raw results and evidence
    bugs/               bug reports, plus jira-report.md (what was or would be sent)
```

`results/index.html` shows each test across its last 20 runs. Use it to spot flaky tests and to find tests that are ready for `/graduate-test`.

## Statuses and triage

| Status | Meaning |
|--------|---------|
| PASS | Every step matched |
| FAIL | Failed on both attempts. A bug report is written. |
| FLAKY | Failed once, then passed on the re-run |
| BLOCKED | Couldn't run: setup failed, data missing, environment down, or the test file is malformed |
| NOT RUN | The agent stopped before the test produced a result |

| Triage category | Meaning |
|-----------------|---------|
| `product-bug` | The app is wrong |
| `test-data` | The account or data the test needs is wrong or missing |
| `environment` | The environment is down, slow or misconfigured |
| `test-defect` | The test itself is outdated or ambiguous |

## Options

Set these when you start Claude, for example `HEADED=1 BASE_URL=https://staging.example.com claude`.

| Variable | Effect |
|----------|--------|
| `HEADED=1` | Shows the browser. A session that fails stays open so you can inspect it. |
| `BASE_URL=<origin>` | Runs every test against another host. Each test keeps its own path. |
| `QA_PROJECT_NAME` | Sets the report title |
| `QA_FLAKY_FAILS_GATE=true` | Counts FLAKY as FAIL in `status.txt` |

To run a suite without the chat (for example, before you leave for the day):

```bash
claude -p "Follow the instructions in .claude/commands/run-suite.md exactly. Use this as its \$ARGUMENTS value: tests/ smoke. Obey CLAUDE.md." \
  --allowedTools "Bash(playwright-cli:*),Bash(bash scripts/fill-secret.sh:*),Bash(node scripts/run-start.mjs:*),Bash(node scripts/run-finish.mjs:*),Bash(date:*),Read,Write,Glob,Agent" \
  --max-turns 300
```

## Security

- The agent is blocked from reading `.env`, `.env.jira` and `.auth/`. Passwords are typed only by `scripts/fill-secret.sh`, which masks them in its output.
- The Jira token is read only by the upload script, never by the agent. Passwords are masked in every ticket.
- The test runner can write only inside `results/runs/`. A hook enforces this.
- Instructions that appear inside the app's pages are reported, never followed.
- Use test environments and test accounts only.

## Project structure

```
CLAUDE.md                     Rules the agent follows when it runs tests
.claude/commands/             Slash commands
.claude/agents/test-runner.md Runs one test per instance
.claude/skills/               jira-story-to-tests, aio-upload-tests, bug-report, playwright-cli
.claude/settings.json         Permissions and the Jira upload hook (shared with the team)
scripts/                      Linter, run start/finish, reports, Jira upload, secret typing
templates/                    Test case template and result example
tests/                        Your test cases (gitignored). One folder per story: tests/<KEY>-cases/
test-data/                    Data files that tests reference
e2e/                          Playwright specs created by /graduate-test
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Test is BLOCKED as "Malformed test (linter)" | Run `npm run lint` and fix what it reports, often a leftover `[CONFIRM TEXT]` |
| Login fails with `test-data` triage | Check the account in `.env` on the target environment |
| "No Atlassian / AIO MCP tools available" | Connect or re-authenticate that server in Claude Code (`/mcp`) |
| Browser doesn't start | `playwright-cli install-browser` |
| `playwright-cli` command errors | Check `playwright-cli --version` is 0.1.22, then see `playwright-cli --help` |
| Nothing appears in Jira | `JIRA_DRY_RUN` is still `true`. Check `bugs/jira-report.md`. |
| `/graduate-test` can't find the browser | `npx playwright install chromium` |

## Limits

- Verdicts come from an AI reading the page, so the more precisely a step is worded, the more stable the result.
- Agent runs are slower than scripted tests and cost more. Move stable tests to `e2e/` with `/graduate-test`.
