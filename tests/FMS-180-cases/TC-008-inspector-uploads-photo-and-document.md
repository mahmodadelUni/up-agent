---
id: TC-008
title: Inspector uploads a photo and a document to a trip report
priority: High
type: functional
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, attachments]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC2a and AC2c: an inspector can attach a photo and a document to a trip report, and both are linked to that trip's report after submission.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- Sample files exist: `test-data/files/sample-photo.jpg` and `test-data/files/sample-document.pdf`, both under the size limit
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`

## Test data

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| Report description | QA-AUTO-TC-008 report with attachments |
| Photo              | test-data/files/sample-photo.jpg       |
| Document           | test-data/files/sample-document.pdf    |

## Setup

| #   | Action                                                                  | Expected result                                                                  |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Open base_url                                                           | The login screen with an email field is visible                                  |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"  | The password screen is visible                                                   |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in" | The inspector home page is visible and the URL no longer contains the login path |
| 4   | Open the reports page from the menu item "File a report"                | The reports page is visible and lists at least one assigned trip or inspection   |

## Steps

| #   | Action                                                                                                 | Expected result                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Click the create report action "File a report" for the first assigned trip and note its trip reference | A report form is visible showing the noted trip reference                                        |
| 2   | Type "QA-AUTO-TC-008 report with attachments" into the report description field                        | The description field shows "QA-AUTO-TC-008 report with attachments"                             |
| 3   | Upload test-data/files/sample-photo.jpg in the attachments field                                       | "sample-photo.jpg" is listed as an attachment with no error                                      |
| 4   | Upload test-data/files/sample-document.pdf in the attachments field                                    | "sample-document.pdf" is listed as an attachment with no error; 2 attachments are listed         |
| 5   | Click the submit button "File a report"                                                                | The success message "File a report" is visible                                                   |
| 6   | Open the submitted report from the reports list                                                        | The report shows the noted trip reference and lists "sample-photo.jpg" and "sample-document.pdf" |

## Teardown

| #   | Action                                                                                | Expected result                                                                                     |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Remove the report whose description starts with "QA-AUTO-TC-008", if the UI allows it | The report is no longer in the list, or the UI offers no remove action (note it under observations) |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC2a, AC2c)
