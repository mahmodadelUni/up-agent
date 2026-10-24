---
id: TC-011
title: Inspector cannot see another inspector's report or an unassigned trip
priority: High
type: negative
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, permissions]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC3a, BR1 and IMP2: an inspector does not see reports of trips assigned to another inspector and cannot open such a report by direct URL.

## Preconditions

- Two inspector accounts exist: `env:APP_INSPECTOR_EMAIL` / `env:APP_INSPECTOR_PASS` and `env:APP_INSPECTOR2_EMAIL` / `env:APP_INSPECTOR2_PASS`
- The second inspector has a submitted report on a trip that is not assigned to the first inspector
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`, `APP_INSPECTOR2_EMAIL`, `APP_INSPECTOR2_PASS`

## Test data

| Field                    | Value                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- |
| Other inspector's report | the newest report of the second inspector (URL and trip reference noted in Setup) |

## Setup

| #   | Action                                                                                                               | Expected result                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Open base_url                                                                                                        | The login screen with an email field is visible                     |
| 2   | Type env:APP_INSPECTOR2_EMAIL into the email field and click "Continue"                                              | The password screen is visible                                      |
| 3   | Type env:APP_INSPECTOR2_PASS into the password field and click "Sign in"                                             | The inspector home page is visible                                  |
| 4   | Open the reports page from the menu item "File a report", open the newest report and note its URL and trip reference | The report detail page is visible; URL and trip reference are noted |
| 5   | Sign out                                                                                                             | The login screen is visible                                         |

## Steps

| #   | Action                                                                  | Expected result                                                                                                 |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"  | The password screen is visible                                                                                  |
| 2   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in" | The inspector home page is visible                                                                              |
| 3   | Open the reports page from the menu item "Report a file"                | The reports list does not contain the trip reference noted in Setup step 4                                      |
| 4   | Open the report URL noted in Setup step 4 directly                      | The report details are not shown; an access error "Report a file" or a redirect away from the report is visible |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC3a, BR1, IMP2 implied)
