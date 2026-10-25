#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose_file="${script_dir}/../tests/docker/compose.yml"
project="guildboard-docker-smoke-$$"
compose=(docker compose --project-name "${project}" --file "${compose_file}")

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
docker info >/dev/null || { echo "the Docker daemon is not available" >&2; exit 1; }
docker compose version >/dev/null || { echo "docker compose is required" >&2; exit 1; }

cleanup() {
  status=$?
  trap - EXIT
  set +e
  if (( status != 0 )); then
    echo "Docker smoke test failed; container status and logs follow." >&2
    "${compose[@]}" ps >&2
    "${compose[@]}" logs --no-color >&2
  fi
  # The unique project name limits cleanup to resources created by this run.
  "${compose[@]}" down --volumes --remove-orphans >/dev/null
  exit "${status}"
}
trap cleanup EXIT

"${compose[@]}" build

# Importing the app with its PostgreSQL URL catches missing or wrong DB drivers.
"${compose[@]}" run --rm --no-deps backend python -c \
  'import sqlalchemy; print(sqlalchemy.__version__); import src.main'

"${compose[@]}" up --detach --wait --wait-timeout 120

"${compose[@]}" exec -T backend python -c \
  'from sqlalchemy import text; from src.database import engine; c = engine.connect(); assert c.execute(text("SELECT 1")).scalar_one() == 1; c.close(); print("database SELECT 1: ok")'

# Run probes inside the backend network namespace; no host ports are exposed.
"${compose[@]}" exec -T backend python - <<'PY'
import json
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen

BASE = "http://frontend"


def get(path):
    with urlopen(BASE + path, timeout=5) as response:
        return response.status, response.read(), response.headers


for path in ("/", "/calendar"):
    status, body, _ = get(path)
    assert status == 200 and b'id="root"' in body, (path, status)

status, body, _ = get("/api/health")
health = json.loads(body)
assert status == 200 and health["status"] == "healthy", health

status, body, _ = get("/api/events")
events = json.loads(body)
assert status == 200 and events == {"count": 0, "events": []}, events

try:
    get("/api/auth/me")
    raise AssertionError("/api/auth/me unexpectedly accepted an anonymous request")
except HTTPError as error:
    assert error.code == 401, error.code
    assert json.loads(error.read())["detail"] == "Authentication required."


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return None


request = Request(BASE + "/auth/login", headers={"Accept": "text/html"})
try:
    build_opener(NoRedirect).open(request, timeout=5)
    raise AssertionError("/auth/login unexpectedly avoided the login error redirect")
except HTTPError as error:
    assert error.code == 303, error.code
    assert error.headers["Location"] == "/login?error=OAUTH_NOT_CONFIGURED"

print("frontend, SPA routes, API, auth, and proxy checks: ok")
PY
