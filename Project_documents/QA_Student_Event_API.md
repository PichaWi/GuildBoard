# QA Evidence: Student Event API Authorization

## Test objective

Verify that a Student cannot bypass the frontend permission controls by calling
the event creation API directly.

## Request

- Tested at (UTC): `2026-09-11T04:35:06.413895+00:00`
- Method and endpoint: `POST http://127.0.0.1:8765/api/events`
- Student login status: `200`
- Authenticated session role: `Student`
- Spoof attempt: `X-User-Role: Lecturer` (ignored by backend)
- Content type: `application/json`
- Expected status: `403 Forbidden`

## Result

- Actual status: `403`
- Response body: `{"detail":"Students are not permitted to create events."}`
- Outcome: **PASS**

The backend denied the request before persistence. The automated API test also
asserts that no Event row is created for the rejected Student request.

## Browser integration evidence

A headless Chromium run against the same live server also verified:

- Student: Create Event navigation is hidden and Publish is disabled.
- Lecturer: Publish sends `POST /api/events` and receives `201 Created`.

This confirms the frontend permission matrix and the real form-to-backend
integration independently of the direct Student API rejection above.

## Reproduce

Start GuildBoard with a non-production environment, then run:

```sh
python scripts/qa_student_event_permission.py
```

Local QA uses a signed development session pending Google OAuth integration.
Roles come from the verified session; caller-controlled role headers are ignored.
