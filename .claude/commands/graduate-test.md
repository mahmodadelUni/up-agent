---
description: Convert a stable Markdown test case into a scripted Playwright Test spec for fast, token-free regression runs
argument-hint: <path to test .md file>
allowed-tools: Bash(playwright-cli:*), Bash(npx playwright:*), Bash(node scripts/lint-tests.mjs:*), Read, Write, Glob
---

Graduate this test to a scripted spec: $ARGUMENTS

1. Read the test file. Then Glob `results/runs/*/data/<TC-ID>.json` and read the newest three (run folder names sort by time). Only proceed if the last three results are all `PASS` (not FLAKY). Otherwise stop and say the test is not stable enough, listing those statuses.
2. Re-run the steps with `playwright-cli` once to discover robust locators. Prefer `getByRole`, `getByLabel`, `getByText`. Avoid CSS and XPath unless nothing else works.
3. Write `e2e/<TC-ID>.spec.ts` using `@playwright/test`:
   - One `test()` per Markdown test, titled `<TC-ID> <title>`.
   - Each Markdown step becomes a `test.step()` with the same wording.
   - Each Expected Result becomes a web-first assertion (`await expect(...)`). No fixed sleeps.
   - Credentials via `process.env` (`playwright.config.ts` loads `.env`). Never hardcode.
   - Base URL via `playwright.config.ts` (`use.baseURL`).
4. Run `npx playwright test e2e/<TC-ID>.spec.ts` (if the browser is missing, run `npx playwright install chromium` first) and fix until green. If it cannot go green without changing what is being verified, stop and report.
5. Reply with the spec path and the run result.
