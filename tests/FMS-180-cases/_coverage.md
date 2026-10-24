# Coverage — FMS-180: Inspectors report

Generated: 2026-10-20 · Story status: In Progress · Link: https://uniparticle.atlassian.net/browse/FMS-180

| Condition | Text (short) | Tests |
|-----------|--------------|-------|
| AC1a | Create and submit a report for an assigned trip | TC-005 |
| AC1b | Report has trip reference, description, submission date and time | TC-005 |
| AC1c | Document issues, observations, incidents, findings | TC-006 |
| AC2a | Upload photos and documents | TC-008 |
| AC2b | Validate file formats and size limits | TC-009, TC-010 |
| AC2c | Attachments linked to the trip record | TC-008 |
| AC3a | Inspector sees only reports of own assignments | TC-011 |
| AC3b | Admin views reports and attachments from dashboard | TC-012 |
| AC3c | Submission timestamp and inspector identity retained | TC-005, TC-012 |
| BR1 | Role-based access control | TC-011, TC-013 |
| BR2 | Reports linked to inspector and trip | TC-012 |
| BR3 | Audit trail for report submission | PARTIAL: TC-012 checks timestamp and identity; no audit-log screen described |
| BR4a | Access restricted on account deactivation | TC-013 |
| BR4b | Access restricted on assignment revocation | TC-014 |
| BR5 | Clear success and error messages | TC-005, TC-007, TC-009 |
| IMP1 | Required fields validated (implied) | TC-007 |
| IMP2 | No report on an unassigned trip (implied) | TC-011 |

## Open questions
- Supported file formats and the file-size limit (per file or per report)?
- Are issues / observations / incidents / findings a type field, sections, or free text?
- What do the "configured reporting permissions" allow? Can inspectors edit or delete submitted reports?
- Is there an audit-trail screen for report submissions?
- Menu labels and URLs of the inspector reports page and the admin reports view.
- All success and error messages ([CONFIRM TEXT] in the tests).
- Behaviour of an open inspector session on deactivation; visibility of past reports after an assignment is revoked.
