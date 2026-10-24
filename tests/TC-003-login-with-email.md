---
id: TC-003
title: Login with a valid email [Automation test]
priority: High
type: smoke
base_url: https://uatfleet.noor.city
tags: [authentication, smoke]
requires_auth: true
---

## Objective

Verify that a user with a valid email and password can sign in and reach the dashboard.

## Preconditions

- The account in `APP_EMAIL_VALID` exists on the target environment and uses the password in `APP_PASS`
- Credentials are provided via env vars: `APP_EMAIL_VALID`, `APP_PASS`

## Test data

| Field    | Value               |
| -------- | ------------------- |
| Username | env:APP_EMAIL_VALID |
| Password | env:APP_PASS        |

## Steps

| #   | Action                                                                                                                     | Expected result                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Open base_url                                                                                                              | The "Sign In" form with "Email" field is shown                    |
| 2   | Type env:APP_EMAIL_VALID in "Email" and click on (`Continue`) and enter env:APP_PASS in "Password", then click (`Sign in`) | The URL is no longer /auth/login and no error message is shown    |
| 3   | Look at the page after sign-in                                                                                             | The signed-in dashboard is shown with the main navigation visible |

## Pass criteria

- The user is signed in and the dashboard is visible.

## Notes
