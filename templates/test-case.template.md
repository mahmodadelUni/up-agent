---
id: TC-XXX
title: <short, outcome-focused title>
priority: High | Medium | Low
type: functional | regression | smoke | negative
base_url: https://staging.example.com/path
tags: [area, smoke]
requires_auth: false
jira: PROJ-123
---

## Objective

<One sentence: what behavior is being verified and why it matters.>

## Preconditions

- <System state required before Setup / step 1>
- Credentials are provided via env vars: `APP_EMAIL`, `APP_PASS`

## Test data

| Field | Value |
| ----- | ----- |
| <field> | <value or `env:APP_VAR_NAME`> |

## Setup (optional)

<Steps that create or check the data this test needs. If one fails, the test is BLOCKED, not FAILED.>

| # | Action | Expected result |
| - | ------ | --------------- |
| 1 | <ONE action> | <ONE observable outcome> |

## Steps

| # | Action | Expected result |
| - | ------ | --------------- |
| 1 | <ONE action> | <ONE observable, verifiable outcome> |
| 2 | <ONE action> | <ONE observable, verifiable outcome> |

## Teardown (required if the steps change data)

<Steps that put the data back. They run even when a step fails, and never change the verdict.>

| # | Action | Expected result |
| - | ------ | --------------- |
| 1 | <ONE action> | <ONE observable outcome> |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes (optional)

- <Known quirks, out-of-scope items, links to Jira / AIO Tests IDs>

---

### Authoring rules

- One action per step. One verifiable expectation per step.
- Expected results must be observable: visible text, URL, element state, count. Not "works correctly".
- Quote exact UI text in `"double quotes"` so the agent matches it literally.
- Reference secrets as `env:APP_*`, never inline.
- Negative tests state the exact expected error message.
- `smoke` tests have 5 steps or fewer. Longer flows are `functional` or `regression`.
- `jira` is optional: the key of the story this test covers. Remove the line if there is none.
- Check a test before committing it: `node scripts/lint-tests.mjs tests/TC-XXX-*.md`
