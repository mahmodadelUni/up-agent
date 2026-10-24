---
id: TC-005
title: Inspector submits a report for an assigned trip
priority: High
type: smoke
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, smoke]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC1a, AC1b and BR5: an inspector can create and submit a report for an assigned trip, and the saved report shows the trip reference, description and submission date and time.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`

## Test data

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| Inspector email    | `env:APP_INSPECTOR_EMAIL`                          |
| Inspector password | `env:APP_INSPECTOR_PASS`                           |
| Report type        | Observation                                        |
| Report description | QA-AUTO-TC-005 routine inspection, no issues found |

## Setup

| #   | Action                                                                  | Expected result                                                                  |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Open base_url                                                           | The login screen with an email field is visible                                  |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"  | The password screen is visible                                                   |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in" | The inspector home page is visible and the URL no longer contains the login path |
| 4   | Open the reports page from the menu item (`File a report`)              | The reports page is visible                                                      |

## Steps

| #   | Action                                                                                      | Expected result                                                                  |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Select the assigned trip from (`Trip DDL`)                                                  | A trip should be selected                                                        |
| 2   | Select the report type from (`Report type`)                                                 | 4 types should be visible in DDL and user can only select one                    |
| 2   | Type "QA-AUTO-TC-005 routine inspection, no issues found" into the report description field | The description field shows "QA-AUTO-TC-005 routine inspection, no issues found" |
| 3   | Click the submit button (`Send report`)                                                     | The success message "Report sent." is visible                                    |

## Teardown

| #   | Action | Expected result                           |
| --- | ------ | ----------------------------------------- |
| 1   | Logout | User should be redirected to login screen |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC1a, AC1b, BR5)
- OPEN QUESTION: can an inspector delete a submitted report? If not, the test report stays and is recognisable by the QA-AUTO-TC-005 marker.
