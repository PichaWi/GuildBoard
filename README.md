# Guild Board 
## Project D: Course Support & Activity Dashboard

**Course:** Individual Software Development Process' 2026 (ISP-SKE26)

## Group Members

| Name | Student ID | GitHub Username |
|---|---|---|
| Picha Wiwattanawongsa | 6610545430 | PichaWi |
| Prima Xivivadh | 6610545332 | pmx-16 |
| Navin Bunthuphanich | 6610545251 | SporkFoon |
| Phasathat Jaruchitsophon | 6610545375 | Tasachii |

## Objective

To design and develop a Course Support & Activity Dashboard that maintains accurate, up-to-date course activity and support information, and provides appropriate role-based access for lecturers, TAs, administrators, and students as replacing the current reliance on outdated, uncoordinated tools.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML / CSS / vanilla JS |
| Backend | FastAPI |
| Database | SQLAlchemy ORM / PostgreSQL |
| Auth | Google OAuth2, restricted to @ku.th domain (SRS-11, SRS-12) |
| Project Management | Plane.so |

## Architecture Summary

FastAPI serves the API ( `src/views`, `src/controllers`) and enforces auth/validation; the data model (`src/models/event.py`) is defined in SQLAlchemy and auto-creates its own schema on startup — no manual SQL needed. The frontend currently(Iteration1) is the static HTML/JS in `static/`, wired to the API via `fetch()`; a React frontend is planned for a later iteration. Can be see in `Project_documents/GuildBoard_ Software Proposal.pdf` and the SRS for full architecture rationale

## Tech / Environment

- Backend: Django REST Framework, Python virtual environment (see `/source/backend/requirements.txt`)
- Frontend: Node + Vite dev server, run via `npm install && npm run dev` in `/source/frontend`
- Copy `.env.example` to `.env` in both frontend and backend before running locally — never commit the real `.env`
- Task tracking has moved to Jira; keep `/docs/iteration-reports/` as the exported record of each iteration for grading purposes

## Video for each Iteration
- Iteration1: https://youtu.be/xCs2F6Ga67U?si=K0rZJTp5d6w1YDOn
- Iteration2
- Iteration3
- Iteration4
- Iteration5

---

## Installation

### Quick Setup (Windows)
After cloning, double-click the setup script:
```
setup.bat
```
This will automatically create a virtual environment and install all dependencies.

### Manual Setup

To clone this project:
```sh
git clone https://github.com/PichaWi/GuildBoard.git
cd GuildBoard
```

To create and run Python Environment for this project:

Windows:
```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Mac:
```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Event API integration

The current iteration exposes `POST /api/events` for the Create Event form and
`GET /api/auth/me` for frontend role checks. Until Google OAuth is connected,
local QA can use `POST /api/auth/dev-login` with server-configured demo accounts.
Successful login creates a signed, HttpOnly session cookie; event permissions
come from that session and never from browser storage or caller-supplied role
headers. Development login is disabled by default and cannot run in production.

Configure local-only credentials in `.env` (never commit the real values):

```dotenv
ENVIRONMENT=development
SESSION_SECRET=<long-random-value>
DEV_LOGIN_ENABLED=true
DEMO_STUDENT_EMAIL=<student-email>
DEMO_STUDENT_PASSWORD=<student-password>
DEMO_LECTURER_EMAIL=<lecturer-email>
DEMO_LECTURER_PASSWORD=<lecturer-password>
```

Run the direct Student API authorization check while the server is running:

```sh
QA_STUDENT_EMAIL=<student-email> \
QA_STUDENT_PASSWORD=<student-password> \
python scripts/qa_student_event_permission.py
```

The check logs in as Student, sends a spoofed `X-User-Role: Lecturer` header,
and passes only when the backend returns the expected `403 Forbidden` response.
Hiding the Create Event navigation item is defense-in-depth, not the
authorization boundary.

---
