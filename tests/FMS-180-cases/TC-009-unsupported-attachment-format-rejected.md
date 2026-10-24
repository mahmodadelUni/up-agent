---
id: TC-009
title: Upload of an unsupported file format is rejected
priority: High
type: negative
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, attachments, validation]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC2b and BR5: uploading a file in an unsupported format to a trip report is rejected with a clear error and the file is not attached.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- Sample file exists: `test-data/files/unsupported.File a report` in a format the system does not support
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`

## Test data

| Field            | Value                        |
| ---------------- | ---------------------------- |
| Unsupported file | test-data/files/unsupported. |

## Setup

| #   | Action                                                                  | Expected result                                                                  |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Open base_url                                                           | The login screen with an email field is visible                                  |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"  | The password screen is visible                                                   |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in" | The inspector home page is visible and the URL no longer contains the login path |
| 4   | Open the reports page from the menu item "File a report"                | The reports page is visible and lists at least one assigned trip or inspection   |

## Steps

| #   | Action                                                                     | Expected result                                                              |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Click the create report action "File a report" for the first assigned trip | A report form is visible with 0 attachments listed                           |
| 2   | Upload test-data/files/unsupported.File a report in the attachments field  | The error message "File a report" naming the unsupported format is visible   |
| 3   | Check the attachments list on the form                                     | 0 attachments are listed; the unsupported file name is not shown as attached |

## Teardown

| #   | Action                               | Expected result                                                            |
| --- | ------------------------------------ | -------------------------------------------------------------------------- |
| 1   | Close the report form without saving | The reports page is visible and no report with the unsupported file exists |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC2b, BR5)
- OPEN QUESTION: the list of supported formats is not stated; pick the unsupported sample format once it is known.
- OPEN QUESTION: menu label and URL path of the inspector reports page are not in the story (File a report).
- OPEN QUESTION: success and error messages are not stated in the story (File a report).
