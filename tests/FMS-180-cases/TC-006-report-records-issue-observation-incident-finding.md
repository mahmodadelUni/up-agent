---
id: TC-006
title: Report records issue, observation, incident and finding entries
priority: Medium
type: functional
base_url: https://uatfleet.noor.city
tags: [inspector, inspection-report]
requires_auth: true
jira: FMS-180
---

## Objective

Verify AC1c: an inspector can document an issue, an observation, an incident and an inspection finding in a trip report, and all four are shown on the submitted report.

## Preconditions

- An inspector account exists in `env:APP_INSPECTOR_EMAIL` with the password in `env:APP_INSPECTOR_PASS`
- At least one trip or inspection is assigned to that inspector on the target environment
- Credentials are provided via env vars: `APP_INSPECTOR_EMAIL`, `APP_INSPECTOR_PASS`

## Test data

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| Report description | QA-AUTO-TC-006 entries check                    |
| Issue              | QA-AUTO-TC-006 issue: broken side mirror        |
| Observation        | QA-AUTO-TC-006 observation: driver on time      |
| Incident           | QA-AUTO-TC-006 incident: minor scratch at depot |
| Finding            | QA-AUTO-TC-006 finding: tyre pressure low       |

## Setup

| #   | Action                                                                  | Expected result                                                                  |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Open base_url                                                           | The login screen with an email field is visible                                  |
| 2   | Type env:APP_INSPECTOR_EMAIL into the email field and click "Continue"  | The password screen is visible                                                   |
| 3   | Type env:APP_INSPECTOR_PASS into the password field and click "Sign in" | The inspector home page is visible and the URL no longer contains the login path |
| 4   | Open the reports page from the menu item "File a report"                | The reports page is visible and lists at least one assigned trip or inspection   |

## Steps

| #   | Action                                                                                                      | Expected result                                                               |
| --- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Click the create report action "File a report" for the first assigned trip                                  | A report form is visible                                                      |
| 2   | Type "QA-AUTO-TC-006 entries check" into the report description field                                       | The description field shows "QA-AUTO-TC-006 entries check"                    |
| 3   | Add an entry of kind "File a report" (issue) with text "QA-AUTO-TC-006 issue: broken side mirror"           | The entry is listed on the form with that text                                |
| 4   | Add an entry of kind "File a report" (observation) with text "QA-AUTO-TC-006 observation: driver on time"   | The entry is listed on the form with that text                                |
| 5   | Add an entry of kind "File a report" (incident) with text "QA-AUTO-TC-006 incident: minor scratch at depot" | The entry is listed on the form with that text                                |
| 6   | Add an entry of kind "File a report" (finding) with text "QA-AUTO-TC-006 finding: tyre pressure low"        | The entry is listed on the form with that text                                |
| 7   | Click the submit button "File a report"                                                                     | The success message "File a report" is visible                                |
| 8   | Open the submitted report from the reports list                                                             | All four entries are shown with their kind and the exact texts from Test data |

## Teardown

| #   | Action                                                                                | Expected result                                                                                     |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Remove the report whose description starts with "QA-AUTO-TC-006", if the UI allows it | The report is no longer in the list, or the UI offers no remove action (note it under observations) |

## Pass criteria

All expected results match their snapshots. Any mismatch = FAIL.

## Notes

- Source: FMS-180 (AC1c)
