# Docker smoke test

This is a small check for the Docker setup. It uses the project's existing
Dockerfiles and Nginx config. It does not change the application or install extra
Python packages to make the backend pass.

## Run it

Start Docker Desktop, then run this from the repository root:

```bash
bash scripts/test_docker.sh
```

Use Bash on macOS, Linux, or WSL with Docker integration enabled. Docker Compose
must support `up --wait`. The first run needs internet access to download images
and dependencies.

No `.env` file is needed. `tests/docker/compose.yml` supplies test-only settings
and starts a separate PostgreSQL database. It does not publish host ports or
mount the project's existing database volume. Each run gets its own Compose
project name. The script removes that run's containers, network, and volumes on
exit, including when a check fails. Built images and build cache are retained.

## What it checks

1. Build the backend and frontend using their existing Dockerfiles.
2. Import the backend with a PostgreSQL URL. This catches a missing Python
   driver before waiting for an API that cannot start.
3. Wait for PostgreSQL, FastAPI, and Nginx to become ready.
4. Run `SELECT 1` through the backend's SQLAlchemy engine. A healthy HTTP
   endpoint alone does not prove that the database connection works.
5. Request `/` and `/calendar` through Nginx and check for the React root.
6. Check `/api/health`, the empty event feed, and the expected `401` response
   for an anonymous `/api/auth/me` request through Nginx.
7. Check that `/auth/login` reaches FastAPI and returns the expected login
   redirect when Google credentials are not configured.

The script stops at the first failed step and returns a nonzero exit code.
Later checks have not passed if an earlier check fails. It prints container
logs before cleanup to help identify the failed service.

This is a container smoke test, not a browser test. It does not test real Google
sign-in, React interactions, production credentials, or event creation. The test
Compose file reuses the production images but has its own settings, so it does
not certify every setting in the root `docker-compose.yml`.

## Backend dependency check

PostgreSQL is the database server. SQLAlchemy is the Python database library.
Psycopg is the driver SQLAlchemy uses to talk to PostgreSQL. Installing the
database server does not install its Python driver into the backend image.

The current requirements include `sqlalchemy>=2.0.28` and
`psycopg2-binary>=2.9.9`. The database URL uses `postgresql://`, without naming
a driver. SQLAlchemy 2.1 changed the default for that URL to `psycopg` (version
3). The `psycopg2-binary` package provides `psycopg2`, not `psycopg`.

Reference: [SQLAlchemy 2.1 release notes](https://www.sqlalchemy.org/blog/2026/09/24/sqlalchemy-2.1.0-released/).

On 25 October 2026, a separate local Python 3.14 environment installed the
unchanged requirements and selected SQLAlchemy 2.1.6 and psycopg2 2.9.13.
Importing `src.main` with the test PostgreSQL URL failed:

```text
src.main -> src.database -> create_engine -> import psycopg
ModuleNotFoundError: No module named 'psycopg'
```

That failure happens before a database connection is attempted. It is a driver
mismatch, not evidence that PostgreSQL is down or that Nginx is broken. The
backend team needs to choose a driver and make the requirements and connection
URL agree. This test change leaves that decision and all application settings
untouched.

## Docker result — 25 October 2026

Tested on macOS ARM64 with Docker Engine 29.5.2 and Compose 5.1.4, using
application commit `6bbf021` and the smoke tests on `test/docker-smoke`.

| Check | Result |
| --- | --- |
| Bash syntax, ShellCheck, and embedded Python syntax | Passed |
| Compose configuration | Passed |
| Frontend image build, including `npm run build` | Passed |
| Backend image build, including requirements installation | Passed |
| Backend import inside the Python 3.11 container | Failed: missing `psycopg` |
| Database query and HTTP/Nginx checks | Not reached because the import failed |
| Removal of the test container and network | Passed; no smoke-test containers or networks remained |

The final smoke-test run returned exit code `1`. Its container installed
SQLAlchemy 2.1.6 and failed at the same `import psycopg` shown above. Both images
build, but that is not enough to say the application works in Docker. The
backend cannot start with this dependency and URL combination. The checks after
the import still need to run once the backend team has resolved the mismatch.

The cleanup exit status was also checked separately with simulated command
results: a failed check or failed cleanup returns nonzero. No backend code,
requirements, production Compose settings, or developer environment files were
changed for this test.
