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
| Frontend | React 19 / Vite / Tailwind CSS |
| Backend | FastAPI |
| Database | SQLAlchemy ORM / PostgreSQL |
| Auth | Google OAuth2, restricted to @ku.th domain (SRS-11, SRS-12) |
| Project Management | Plane.so |

## Architecture Summary

FastAPI serves the backend API (`src/views`, `src/controllers`) and enforces auth/validation; the data model (`src/models/event.py`) is defined in SQLAlchemy and auto-creates its own schema on startup. The frontend is built with React 19 and Vite in `/frontend`, proxying `/api` and `/auth` requests to the FastAPI backend.

## Tech / Environment

- Backend: FastAPI, Python virtual environment (see `requirements.txt`)
- Frontend: Node + Vite dev server, run via `npm install && npm run dev` in `/frontend`
- Copy `.env.example` to `.env` in both frontend and backend before running locally — never commit the real `.env`
- Task tracking has moved to Jira; keep `/docs/iteration-reports/` as the exported record of each iteration for grading purposes

## Video for each Iteration
- Iteration1: https://youtu.be/xCs2F6Ga67U?si=K0rZJTp5d6w1YDOn
- Iteration2
- Iteration3
- Iteration4
- Iteration5

---

## Features & API Endpoints

| Feature | Endpoint | Method | Roles | Description |
|---|---|---|---|---|
| **Events** | `/api/events` | GET | All | List events (course filter) |
| | `/api/events` | POST | Lecturer, TA, Admin | Create event |
| | `/api/events/{id}` | GET | All | Get event details |
| **Course Materials** | `/api/materials` | GET | All (published), Staff (unpublished) | List materials with course filter |
| | `/api/materials` | POST | Lecturer, TA, Admin | Upload material (ZIP, ≤25MB) |
| | `/api/materials/{id}` | GET | All (published), Staff (unpublished) | Get material metadata |
| | `/api/materials/{id}/download` | GET | All (published), Staff (unpublished) | Download material file |
| **Search (US-7)** | `/api/search` | GET | TA, Lecturer, Admin | Unified search across tickets, events, materials with filters (query, type, status, owner, date range) |
| **User Management (US-5)** | `/api/users` | GET | Admin | List users with search (?q=) and role filter (?role=) |
| | `/api/users/{id}/role` | PATCH | Admin | Update user role (prevents self-demotion from Admin) |
| **Tickets (US-3)** | `/api/tickets` | GET | TA, Lecturer, Admin | List tickets with status filter |
| | `/api/tickets` | POST | TA, Lecturer, Admin | Create ticket |
| | `/api/tickets/{id}` | PATCH | TA, Lecturer, Admin | Update ticket (status, priority, assignee) |
| | `/api/tickets/{id}/comments` | GET | TA, Lecturer, Admin | Get ticket comments |
| | `/api/tickets/{id}/comments` | POST | TA, Lecturer, Admin | Add comment (body required, ≤2000 chars) |
| **Consultations** | `/api/consultations` | GET | TA, Lecturer, Admin | List consultation sessions |
| | `/api/consultations` | POST | TA | Create consultation record |
| **Notifications** | `/api/notifications` | GET | All | List user notifications |
| **At-Risk Students** | `/api/at-risk` | GET | TA, Lecturer, Admin | Get at-risk student list |
| **Auth** | `/api/auth/me` | GET | All | Current user profile |
| | `/api/auth/dev-login` | POST | Dev only | Local dev login (Student/TA/Lecturer/Admin) |
| | `/api/auth/google` | GET | All | Google OAuth2 login |
| | `/api/auth/callback` | GET | All | Google OAuth2 callback |
| | `/api/auth/logout` | POST | All | Logout |

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

### Frontend Setup (React + Vite)

```sh
cd frontend
npm install
npm run dev
```

The React app will be running at `http://localhost:5173/` and proxies backend `/api` requests to `http://localhost:8000/`.

---

## Docker Deployment

### Prerequisites
- Docker Engine & Docker Compose v2+
- Create your `.env` file from `.env.example`:
  ```sh
  cp .env.example .env
  ```

### Running with Docker Compose
Build and launch all services (Frontend, Backend, and PostgreSQL database):
```sh
docker compose up --build
```
Or run in detached mode in the background:
```sh
docker compose up --build -d
```
To stop the services:
```sh
docker compose down
```

### Services & Port Mappings
| Service | Internal Port | Host URL / Port | Description |
|---|---|---|---|
| **Frontend** | `80` (Nginx) | [`http://localhost:3000`](http://localhost:3000) | React SPA with client-side routing fallback & reverse proxy |
| **Backend** | `8000` (Uvicorn) | [`http://localhost:8000`](http://localhost:8000) | FastAPI REST API & Google OAuth endpoints |
| **Database** | `5432` (Postgres) | `localhost:5432` | PostgreSQL persistent database (`postgres:16-alpine`) |

### Switching Mock Data Mode (`VITE_USE_MOCK`)
You can toggle between client-side mock datasets and live API integration:
1. Update `VITE_USE_MOCK` in your `.env` file:
   - **Live Backend Mode:** `VITE_USE_MOCK=false`
   - **Offline Mock Mode:** `VITE_USE_MOCK=true`
2. Rebuild and restart the container stack:
   ```sh
   docker compose up --build frontend
   ```

## Database (PostgreSQL + Alembic)

Tables (users, events, tickets, consultation_sessions, course_materials, ticket_comments) are
created by **Alembic** migrations in `migrations/`. ER diagram:
`Diagrams/Database_ER_Diagram.md`.

- **Whole app in Docker:** `docker compose up --build`. The backend container runs
  `alembic upgrade head` before starting, so the tables are always up to date.
- **One-click (Windows), database only:** start Docker Desktop, run `setup.bat`
  once, then double-click `setup_database.bat` (starts PostgreSQL, creates the
  tables, adds demo data). Then set in `.env`:
  `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/guildboard`
- **Manual:** `docker compose up -d db`, then `alembic upgrade head`, then
  `python scripts/seed_data.py`.
- **Changing the schema:** edit the model in `src/models/`, run
  `alembic revision --autogenerate -m "what changed"`, check the new file in
  `migrations/versions/`, then `alembic upgrade head`. Never edit tables by hand.

If `DATABASE_URL` is empty the app uses a local SQLite file (`guildboard.db`) and
creates tables automatically; tests always use in-memory SQLite.

## Testing

Run the backend tests from the repository root after installing `requirements.txt`:

```sh
python -m pytest -q
```

Run the frontend regression tests and production build:

```sh
cd frontend
npm ci
npm test
npm run build
```

For real HTTP requests and PostgreSQL data, start Docker Desktop and run
`bash scripts/test_docker.sh` from the repository root. This uses a temporary
database and test-only Student/Lecturer accounts, then removes its containers
and volumes. It does not use your `.env` or existing database.

GitHub Actions runs the backend tests, frontend tests, and build on pushes and
pull requests. A repository admin must make **Backend tests** and **Frontend
tests and build** required checks for `main` if failed checks should block merges.
The workflow alone does not enforce that setting.

## API Integration Summary

The current iteration exposes the following API groups:

### Events (`/api/events`)
- `POST /api/events` for the Create Event form
- `GET /api/events` with optional `?course=` filter

### Course Materials (`/api/materials`)
- `GET /api/materials` lists materials (course filter via `?course=`)
- `POST /api/materials` uploads ZIP files (≤25MB) with versioning
- `GET /api/materials/{id}/download` streams the stored file

### Search (`/api/search`) — US-7
- `GET /api/search?q=<query>&type=<ticket|event|material>&status=<...>&owner=<...>&date_from=<ISO>&date_to=<ISO>`
- Returns `{ count, results: [{ id, type, title, owner, status, date, url }] }`
- Auth required; Students receive 403

### User Management (`/api/users`) — US-5
- `GET /api/users?q=<search>&role=<role>` — Admin only
- `PATCH /api/users/{id}/role` with `{ "role": "NewRole" }` — Admin only, prevents self-demotion

### Tickets (`/api/tickets`) — US-3
- `GET /api/tickets?status=<...>` — TA/Lecturer/Admin
- `POST /api/tickets` — TA/Lecturer/Admin
- `PATCH /api/tickets/{id}` — TA/Lecturer/Admin
- `GET /api/tickets/{id}/comments` — TA/Lecturer/Admin
- `POST /api/tickets/{id}/comments` — TA/Lecturer/Admin (body required, trimmed, max 2000 chars)

### Consultations (`/api/consultations`)
- `GET /api/consultations` with course filter
- `POST /api/consultations` — TA only

### Auth
- `GET /api/auth/me` — current user profile
- `POST /api/auth/dev-login` — local dev login with server-configured demo accounts (Student/TA/Lecturer/Admin)
- `GET /api/auth/google` + `GET /api/auth/callback` — Google OAuth2 (@ku.th domain only)

Until Google OAuth is connected, local QA can use `POST /api/auth/dev-login` with server-configured demo accounts.
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
DEMO_TA_EMAIL=<ta-email>
DEMO_TA_PASSWORD=<ta-password>
DEMO_ADMIN_EMAIL=<admin-email>
DEMO_ADMIN_PASSWORD=<admin-password>
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

## Known Limitations

- Google OAuth2 is configured but not fully integrated in production; local dev login is the primary auth method for testing
- Course Materials upload accepts ZIP only (≤25MB); other formats rejected by backend validation
- Search does not yet support pagination (returns all matching results)
- Frontend Role Management page uses client-side filtering in addition to server-side API filters
- Ticket comments are not yet editable/deletable after creation
- No email notifications for ticket updates or comments