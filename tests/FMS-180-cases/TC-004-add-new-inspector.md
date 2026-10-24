---
id: TC-004
title: Add new inspector from admin dashboard, and login with the new inspector
priority: High
type: e2e
base_url: https://uatfleet.noor.city
tags: [authentication, e2e, inspector]
requires_auth: true
---

## Objective

verify creating a new inspector from admin dashboard, and the new inspector can login and generate a password

## Preconditions

- The admin account in `APP_EMAIL_VALID` exists on the target environment and uses the password in `APP_PASS`
- Test data of inspector in `test-data/inspector.json`

## Steps

| #   | Action                                                              | Expected result                                                                             |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Navigate to base_url                                                | Login screen is visible                                                                     |
| 2   | Enter email and click on `Continue`                                 | Password screen is visible                                                                  |
| 3   | Enter password and click on `Sign in`                               | User is logged in and dashboard content is visible                                          |
| 4   | Click on `Inspector Management`                                     | Inspector Management page is opened                                                         |
| 5   | Click on `Add Inspector`                                            | Add new inspector popup is visible                                                          |
| 6   | Fill the required fields from `inspector.json`                      | Required field filled with the test data                                                    |
| 7   | Click on `Add Inspector`                                            | Inspector is added, and link of login for the new inspector is generated and ready for copy |
| 8   | Copy the link and Open new session and navigate to the copied link  | A login form is visible                                                                     |
| 9   | The generated inspector email is prefilled, and click on `continue` | Email is prefilled and Continue button is enabled                                           |
| 10  | Generate a new password and pick it from `inspector.json`           | Password and confirm password fields are matched                                            |
| 11  | Click on `Sign in`                                                  | Inspector is redirected to home page                                                        |

## Pass criteria

Inspector is logged in, and the dashboard is visible

## Notes

- OPEN QUESTION: there is no known "delete inspector" flow, so this test has no Teardown. The inspector it creates stays on the environment.
- Before each run, change the email (and phone number) in `test-data/inspector.json` to values not used yet. Otherwise step 7 fails because the inspector already exists. The automatic re-run (attempt 2) hits the same problem.
