---
id: TC-013
title: Deactivated inspector loses access to reports at once
priority: High
type: negative
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, permissions, account-status]
requires_auth: true
jira: FMS-180
---

## Objective

Verify BR4a and BR1: when the admin deactivates an inspector account, that inspector can no longer reach the reports page or sign in, without waiting for the session to expire.

## Preconditions

- A dedicated, disposable inspector account exists in `env:APP_INSPECTOR3_EMAIL` / `env:APP_INSPECTOR3_PASS` with at least one assigned trip; it is used by this test only
- The admin account in `env:APP_EMAIL_VALID` uses the password in `env:APP_PASS`
- The environment is not production
- Credentials are provided via env vars: `APP_INSPECTOR3_EMAIL`, `APP_INSPECTOR3_PASS`, `APP_EMAIL_VALID`, `APP_PASS`

## Test data

| Field                   | Value                      |
| ----------------------- | -------------------------- |
| Inspector to deactivate | `env:APP_INSPECTOR3_EMAIL` |

## Setup

| #   | Action                                                                                                                           | Expected result                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | In browser tab 1, open base_url and sign in with env:APP_INSPECTOR3_EMAIL / env:APP_INSPECTOR3_PASS ("Continue", then "Sign in") | The inspector home page is visible                               |
| 2   | Open the reports page from the menu item "File a report" and note its URL                                                        | The reports page is visible and lists at least one assigned trip |
| 3   | In browser tab 2, open base_url and sign in with env:APP_EMAIL_VALID / env:APP_PASS ("Continue", then "Sign in")                 | The admin dashboard is visible                                   |

## Steps

| #   | Action                                                                          | Expected result                                                                                          |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | In tab 2, click "Inspector Management"                                          | The Inspector Management page lists the inspector env:APP_INSPECTOR3_EMAIL as active                     |
| 2   | Deactivate that inspector with the action "File a report" and confirm           | The success message "File a report" is visible and the inspector status shows "File a report" (inactive) |
| 3   | In tab 1, reload the reports page URL noted in Setup step 2                     | The reports page is not shown; the inspector is signed out or sees the access error "File a report"      |
| 4   | In tab 1, sign in again with env:APP_INSPECTOR3_EMAIL / env:APP_INSPECTOR3_PASS | Sign-in is refused with the message "File a report"                                                      |

## Teardown

| #   | Action                                                                                      | Expected result                         |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | In tab 2, reactivate the inspector env:APP_INSPECTOR3_EMAIL with the action "File a report" | The inspector status shows active again |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (BR4a, BR1)
