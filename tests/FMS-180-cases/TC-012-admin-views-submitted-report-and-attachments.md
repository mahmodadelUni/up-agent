---
id: TC-012
title: Admin sees a submitted report, its attachments, timestamp and inspector
priority: High
type: functional
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report, admin-dashboard]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC3b, AC3c and BR2: a report submitted by an inspector, with an attachment, is visible to the admin from the dashboard with its attachment, submission timestamp, inspector identity and trip reference.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- The admin account in `env:APP_EMAIL_VALID` uses the password in `env:APP_PASS`
- Sample file exists: `test-data/files/sample-photo.jpg`
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`, `APP_EMAIL_VALID`, `APP_PASS`

## Test data

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| Report description | QA-AUTO-TC-012 report for admin view |
| Attachment         | test-data/files/sample-photo.jpg     |

## Setup

| #   | Action                                                                                                                                                                                                                                                   | Expected result                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Open base_url                                                                                                                                                                                                                                            | The login screen with an email field is visible                                             |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"                                                                                                                                                                                   | The password screen is visible                                                              |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in"                                                                                                                                                                                  | The inspector home page is visible and the URL no longer contains the login path            |
| 4   | Open the reports page from the menu item "File a report", create a report for the first assigned trip with description "QA-AUTO-TC-012 report for admin view" and attachment sample-photo.jpg, submit it, and note the trip reference and inspector name | The success message "File a report" is visible; trip reference and inspector name are noted |
| 5   | Sign out                                                                                                                                                                                                                                                 | The login screen is visible                                                                 |

## Steps

| #   | Action                                                                  | Expected result                                                  |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Type env:APP_EMAIL_VALID into the email field and click "Continue"      | The password screen is visible                                   |
| 2   | Type env:APP_PASS into the password field and click "Sign in"           | The admin dashboard is visible                                   |
| 3   | Open the submitted reports view from the dashboard item "File a report" | A list of submitted reports is visible                           |
| 4   | Open the report with description "QA-AUTO-TC-012 report for admin view" | The report shows the trip reference noted in Setup step 4        |
| 5   | Check the inspector shown on the report                                 | The inspector name noted in Setup step 4 is shown                |
| 6   | Check the submission timestamp on the report                            | A submission date and time is shown and its date is the run date |
| 7   | Check the attachments on the report                                     | "sample-photo.jpg" is listed and opens or previews without error |

## Teardown

| #   | Action                                                                                | Expected result                                                                                     |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Remove the report whose description starts with "QA-AUTO-TC-012", if the UI allows it | The report is no longer in the list, or the UI offers no remove action (note it under observations) |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC3b, AC3c, BR2)
- BR3 (audit trail) is only partly covered here: the stored timestamp and inspector identity are checked, the audit log itself is not.
- OPEN QUESTION: is there an audit-trail screen for report submissions?
- OPEN QUESTION: dashboard label of the admin reports view is not stated (File a report).
- OPEN QUESTION: menu label and URL path of the inspector reports page are not in the story (File a report).
- OPEN QUESTION: success and error messages are not stated in the story (File a report).
