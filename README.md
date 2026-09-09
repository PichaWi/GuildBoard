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
| Frontend | React + Vite + Tailwind CSS + shadcn/ui + MaterialUI |
| Backend | Django REST Framework (DRF) |
| Database | SQL (SQLite for local dev / PostgreSQL for staging — confirm which) |
| Auth | Google OAuth2, restricted to @ku.th domain (SRS-11, SRS-12) |
| Project Management | Jira |

## Architecture Summary

Modular Monolith using MVC (View / Controller / Model) — DRF serves the API and
enforces auth/validation, React consumes it as a separate frontend app.
See `/docs/srs/` sections 9–11 for full architecture rationale.

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

---