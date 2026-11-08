# Iteration 5: integration testing and CI

Owner: Phasathat Jaruchitsophon  
Test date: 8 November 2026  
Starting main commit: `4b4c7e1`  
Code and QA commit checked: `1ec64a8`

## What I worked on

- Added GitHub Actions for backend tests, frontend tests, and the frontend build.
- Added regression tests for the real API response shapes and failed saves.
- Fixed the integration problems those tests exposed.
- Checked real sessions and saved data through Nginx and PostgreSQL.

The existing backend suite covers all four roles using a fake Google provider.
The new Docker QA uses real development-login sessions for Student and Lecturer.
It does not sign in to Google or pretend that TA/Admin development accounts exist.

## Run the checks

```sh
python -m pytest -q
cd frontend
npm ci
npm test
npm run build
```

From the repository root, with Docker Desktop running:

```sh
bash scripts/test_docker.sh
```

The Docker command builds both images, creates a temporary PostgreSQL database,
runs the original startup probes, and runs `scripts/qa_iteration5_real_data.py`.
Its test-only account settings live in `tests/docker/compose.yml`. Cleanup removes
the test containers and volumes, including after a failed check. Images/cache stay.
No developer `.env`, Google credentials, or existing database is needed.

## Results

| Check | Result |
| --- | --- |
| Backend pytest | 210 passed |
| Frontend regression tests | 20 passed: 12 API tests and 8 UI tests |
| Frontend production build | Passed locally and on GitHub Actions |
| Workflow syntax (`actionlint`) | Passed |
| Full Docker test | Passed, exit code 0; test resources removed |
| Browser checks with `VITE_USE_MOCK=false` | Passed for the flows listed below |

[GitHub Actions run for the code and QA commit](https://github.com/PichaWi/GuildBoard/actions/runs/42487047481).

Local browser checks used headless Chromium on macOS ARM64. The Docker backend
used Python 3.11.18, SQLAlchemy 2.1.8, and PostgreSQL 16. GitHub Actions uses
Python 3.11 and Node 22. Backend warnings and existing frontend lint warnings were
left visible; neither check reported a failing test.

## Test cases for the iteration report

| ID | Procedure and expected result | Actual result |
| --- | --- | --- |
| TC-01 | Push code; CI runs pytest, frontend tests, and build. | Pass. Both GitHub jobs passed. Required-merge-check setup is still an admin task. |
| TC-02 | Log in as Lecturer/Student, read `/api/auth/me`, log out, and read it again. | Pass. Correct role before logout; 401 afterward. Browser refresh stayed logged out. |
| TC-03 | Student opens staff routes and sends staff API requests. | Pass. Browser redirects to Calendar; event/ticket writes and at-risk access return 403. All four backend roles remain covered by pytest. |
| TC-04 | Create a ticket with notes, refresh, open its detail, and read it through the API. | Pass. Title and description persist. The missing-notes bug was fixed. |
| TC-05 | Change a ticket's status/priority and reread it; filter by status. | Pass. Database values and displayed values agree after refresh. |
| TC-06 | Create overdue, 47-hour, 49-hour, and closed tickets; then close an eligible ticket. | Pass. Only eligible IDs appear in At-Risk, and closing a ticket removes it on the next request. |
| TC-07 | Create an event, read the feed, and refresh Calendar. | Pass. The event is stored and appears in Calendar using the real feed. |
| TC-08 | Reject saves and check that the UI keeps saved data/drafts and displays an error. | Pass in UI regression tests. A browser check also confirmed priority rejection and the unavailable comment endpoint do not create false saved data. |

For the browser checks, the temporary stack exposed frontend port 3015 and backend
port 8015. These were local test overrides; the committed smoke stack exposes no
host ports. Ticket creation, detail loading, notes, status/priority persistence,
Calendar refresh, logout, and Student route restrictions were checked in Chromium.

## Bugs found and fixed

| Problem | Change and regression evidence |
| --- | --- |
| Calendar expected an array, but the API returns `{count, events}`. | Read `events` and preserve the feed's display fields; `api/events.test.js`. |
| Logout called `/api/auth/logout` instead of `/auth/logout`. | Use the actual auth route with cookies; `api/auth.test.js` and real logout checks. |
| Ticket detail called a GET-by-ID endpoint that does not exist. | Find the ticket in the existing staff list endpoint; `api/tickets.test.js`. |
| Failed edits/uploads/comments changed local data or showed success. | Update saved UI state only after success; page regression tests cover errors and retry. |
| Ticket Detail offered `Resolved`, which the API rejects. | Use `Open`, `In-Progress`, and `Closed`; `TicketDetail.test.jsx`. |
| The new-ticket form dropped its notes. | Send the textarea as `description`; `CreateTicketModal.test.jsx` and a browser/API reread. |

Before the API fixes, seven of the 12 API regression tests failed. The initial
page tests also reproduced false-success behavior before the fixes. Tests now
exercise the corrected behavior rather than just checking that the pages render.

## Still waiting on other work

- **US-9 consultations:** the table exists, but the source has no consultation
  routes. End-to-end consultation logging/search is blocked until that API is ready.
- **Materials, user administration, search, and ticket comments:** the frontend
  refers to routes the backend does not currently expose. Error handling is tested;
  successful server-backed operations for those routes are not claimed here.
- **Other prototype controls:** ticket deletion only changes local state, material
  download only shows a message, and at-risk reminders/TA assignments are still
  demo actions. They need real backend support before being shown as completed work.
- **Google OAuth:** real Google sign-in still needs configured credentials and a
  separate test. The smoke test checks the unconfigured-login redirect only.
- **Merge protection:** a repository admin needs to require the checks named
  `Backend tests` and `Frontend tests and build` on `main`. This account has push
  access but cannot change that setting. CI execution is complete; enforced merge
  protection is not yet confirmed.

## Contribution log wording

Task owned: GitHub Actions CI, real-data integration QA, and regression tests for
frontend/API bugs found during testing.

Course concepts: integration testing, regression testing, continuous integration,
role-based access control, and defect reporting.

Evidence: the workflow, frontend regression tests, Docker QA script, this report,
and the linked GitHub Actions run on branch `test/iteration5-integration`.
