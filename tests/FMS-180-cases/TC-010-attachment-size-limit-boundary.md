---
id: TC-010
title: Attachment at the size limit is accepted and over the limit is rejected
priority: High
type: negative
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, attachments, validation]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC2b with boundary values: a file exactly at the size limit is accepted, and a file just over the limit is rejected with a clear error.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- Sample files exist: `test-data/files/at-limit.jpg` (exactly [] MB) and `test-data/files/over-limit.jpg` (limit + 1 KB)
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`

## Test data

| Field           | Value                          |
| --------------- | ------------------------------ |
| Size limit      | File a report MB               |
| At-limit file   | test-data/files/at-limit.jpg   |
| Over-limit file | test-data/files/over-limit.jpg |

## Setup

| #   | Action                                                                  | Expected result                                                                  |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Open base_url                                                           | The login screen with an email field is visible                                  |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"  | The password screen is visible                                                   |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in" | The inspector home page is visible and the URL no longer contains the login path |
| 4   | Open the reports page from the menu item "File a report"                | The reports page is visible and lists at least one assigned trip or inspection   |

## Steps

| #   | Action                                                                      | Expected result                                                                |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Click the create report action "File a report" for the first assigned trip  | A report form is visible with 0 attachments listed                             |
| 2   | Upload test-data/files/at-limit.jpg (max) in the attachments field          | "at-limit.jpg" is listed as an attachment with no error                        |
| 3   | Upload test-data/files/over-limit.jpg (max + 1 KB) in the attachments field | The error message "File a report" about the size limit is visible              |
| 4   | Check the attachments list on the form                                      | Exactly 1 attachment is listed: "at-limit.jpg"; "over-limit.jpg" is not listed |

## Teardown

| #   | Action                               | Expected result             |
| --- | ------------------------------------ | --------------------------- |
| 1   | Close the report form without saving | The reports page is visible |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC2b)
- OPEN QUESTION: the file-size limit is not stated in the story. Create the sample files once the value is known.
- OPEN QUESTION: is the limit per file or per report? This test assumes per file.
