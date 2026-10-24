---
id: TC-007
title: Report is not submitted when required fields are empty
priority: Medium
type: negative
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, validation]
requires_auth: true
jira: FMS-180
---

## Objective

Verify IMP1 and BR5: a report with an empty description is not submitted and a clear error message is shown.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`

## Test data

| Field              | Value   |
| ------------------ | ------- |
| Report description | (empty) |

## Setup

| #   | Action                                                                                | Expected result                                                                  |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Open base_url                                                                         | The login screen with an email field is visible                                  |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"                | The password screen is visible                                                   |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in"               | The inspector home page is visible and the URL no longer contains the login path |
| 4   | Open the reports page from the menu item "File a report" and count the reports listed | The reports page is visible; the report count is noted                           |

## Steps

| #   | Action                                                                     | Expected result                                                                             |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Click the create report action "File a report" for the first assigned trip | A report form is visible with an empty description field                                    |
| 2   | Leave the description empty and click the submit button "File a report"    | The error message "File a report" is shown at the description field and the form stays open |
| 3   | Go back to the reports page                                                | The report count equals the count noted in Setup step 4                                     |

## Teardown

| #   | Action                                                    | Expected result             |
| --- | --------------------------------------------------------- | --------------------------- |
| 1   | Close the report form without saving, if it is still open | The reports page is visible |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (IMP1 implied, BR5)
