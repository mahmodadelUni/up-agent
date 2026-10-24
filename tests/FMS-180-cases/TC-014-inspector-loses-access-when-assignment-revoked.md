---
id: TC-014
title: Inspector loses report access when the assignment is revoked
priority: High
type: negative
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, permissions, assignment]
requires_auth: true
jira: FMS-180
---

## Objective

Verify BR4b: when the admin revokes a trip assignment, the inspector can no longer see that trip on the reports page or create a report for it.

## Preconditions

- A dedicated inspector account exists in `env:APP_INSPECTOR3_EMAIL` / `env:APP_INSPECTOR3_PASS`
- A disposable trip is assigned to that inspector; its reference is noted before the run
- The admin account in `env:APP_EMAIL_VALID` uses the password in `env:APP_PASS`
- The environment is not production
- Credentials are provided via env vars: `APP_INSPECTOR3_EMAIL`, `APP_INSPECTOR3_PASS`, `APP_EMAIL_VALID`, `APP_PASS`

## Test data

| Field            | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| Trip to unassign | the disposable trip assigned to `env:APP_INSPECTOR3_EMAIL` |

## Setup

| #   | Action                                                                                                                           | Expected result                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | In browser tab 1, open base_url and sign in with env:APP_INSPECTOR3_EMAIL / env:APP_INSPECTOR3_PASS ("Continue", then "Sign in") | The inspector home page is visible                        |
| 2   | Open the reports page from the menu item "File a report" and note the create report URL of the disposable trip                   | The disposable trip is listed with a create report action |
| 3   | In browser tab 2, open base_url and sign in with env:APP_EMAIL_VALID / env:APP_PASS ("Continue", then "Sign in")                 | The admin dashboard is visible                            |

## Steps

| #   | Action                                                                    | Expected result                                                                         |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | In tab 2, open the assignment of the disposable trip from "File a report" | The trip shows the inspector env:APP_INSPECTOR3_EMAIL as assigned                       |
| 2   | Revoke the assignment with the action "File a report" and confirm         | The success message "File a report" is visible and the trip shows no assigned inspector |
| 3   | In tab 1, reload the reports page                                         | The disposable trip is no longer listed                                                 |
| 4   | In tab 1, open the create report URL noted in Setup step 2 directly       | The report form is not shown; the access error "File a report" or a redirect is visible |

## Teardown

| #   | Action                                                                | Expected result                                 |
| --- | --------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | In tab 2, assign the disposable trip back to env:APP_INSPECTOR3_EMAIL | The trip shows that inspector as assigned again |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (BR4b)
