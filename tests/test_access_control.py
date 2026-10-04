"""Authentication & Access module: roles come from the database and gate every write.

Covers SRS-3 (only authorised roles create events) and SRS-8 (server-side role
checks). Google sign-in is replaced by the fake client in conftest.py.
"""
import os
import subprocess
import sys
from datetime import date, time
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select, update
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateTable

from src.config import settings
from src.controllers import users as users_controller
from src.controllers.access import PERMISSION_MATRIX, Action, can, ensure_permission
from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.events import create_event
from src.models.event import Event, EventCreate
from src.models.user import ROLE_VALUES, User

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "set_user_role.py"

VALID_EVENT = {
    "title": "Architecture Review",
    "course_code": "ISP",
    "event_type": "Project Milestone",
    "event_date": "2026-10-20",
    "start_time": "10:00",
    "end_time": "12:00",
}

# The role x action matrix as designed (US-8 permission matrix slide), written out
# separately from the code so the tests check the code against the design.
DESIGNED = {
    Action.VIEW_DRAFT_EVENTS: {"Student": False, "TA": True, "Lecturer": True, "Admin": True},
    Action.CREATE_EVENT: {"Student": False, "TA": True, "Lecturer": True, "Admin": True},
}


class Database:
    """Read and change the rows the app's own database session would see."""

    def __init__(self, session_factory) -> None:
        self._session_factory = session_factory

    def add_user(self, email: str, role: str) -> None:
        with self._session_factory() as db:
            db.add(User(email=email, name=email.split("@")[0], role=role))
            db.commit()

    def role_of(self, email: str) -> str | None:
        with self._session_factory() as db:
            user = db.scalar(select(User).where(User.email == email))
            return user.role if user else None

    def set_role(self, email: str, role: str) -> None:
        with self._session_factory() as db:
            db.execute(update(User).where(User.email == email).values(role=role))
            db.commit()

    def users(self) -> int:
        with self._session_factory() as db:
            return db.scalar(select(func.count()).select_from(User))

    def events(self) -> int:
        with self._session_factory() as db:
            return db.scalar(select(func.count()).select_from(Event))

    def add_draft_event(self) -> None:
        with self._session_factory() as db:
            db.add(
                Event(
                    title="Draft: lab prep",
                    course_code="ISP",
                    event_type="Lab",
                    event_date=date(2026, 10, 14),
                    start_time=time(9, 0),
                    end_time=time(10, 0),
                    publish_immediately=False,
                    created_by_role="Lecturer",
                )
            )
            db.commit()


@pytest.fixture
def database(session_factory):
    return Database(session_factory)


@pytest.fixture
def sign_in(client, google, database):
    """Sign in through the Google callback, optionally with a role already stored."""

    def _sign_in(email: str, stored_role: str | None = None, **claims) -> None:
        if stored_role:
            database.add_user(email, stored_role)
        google({"email": email, "email_verified": True, "name": email.split("@")[0], **claims})
        response = client.get("/auth/callback", follow_redirects=False)
        assert response.status_code == 303, response.text

    return _sign_in


def staff(role: UserRole = UserRole.LECTURER) -> AuthenticatedUser:
    return AuthenticatedUser("someone@ku.th", "Someone", role, "test")


# --- The matrix ---------------------------------------------------------------

@pytest.mark.parametrize("action", list(Action))
@pytest.mark.parametrize("role", list(UserRole))
def test_each_role_gets_exactly_what_the_design_grants(role, action):
    assert can(staff(role), action) is DESIGNED[action][role.value]


def test_every_action_has_a_rule_and_nothing_extra():
    assert set(PERMISSION_MATRIX) == set(Action) == set(DESIGNED)


def test_nobody_signed_in_can_do_nothing():
    assert not any(can(None, action) for action in Action)


def test_ensure_permission_answers_401_for_nobody_and_403_for_the_wrong_role():
    with pytest.raises(HTTPException) as nobody:
        ensure_permission(None, Action.CREATE_EVENT)
    with pytest.raises(HTTPException) as student:
        ensure_permission(staff(UserRole.STUDENT), Action.CREATE_EVENT)

    assert nobody.value.status_code == 401
    assert student.value.status_code == 403
    assert student.value.detail == "Students are not permitted to create events."


# --- Roles come from the database ----------------------------------------------

def test_a_first_time_google_user_is_created_as_a_student(client, sign_in, database):
    sign_in("new.person@ku.th")

    me = client.get("/api/auth/me")

    assert me.json()["role"] == "Student"
    assert database.role_of("new.person@ku.th") == "Student"
    assert database.users() == 1


def test_a_stored_role_is_used_on_the_first_sign_in(client, sign_in, database):
    sign_in("aj.milk@ku.th", stored_role="Lecturer")

    assert client.get("/api/auth/me").json()["role"] == "Lecturer"
    assert database.users() == 1


def test_the_same_person_with_a_different_email_case_is_one_user(client, sign_in, database):
    database.add_user("navin.b@ku.th", "TA")

    sign_in("Navin.B@KU.TH")

    assert client.get("/api/auth/me").json()["role"] == "TA"
    assert database.users() == 1


def test_a_role_changed_in_the_database_applies_on_the_next_request(client, sign_in, database):
    sign_in("grows.into.it@ku.th")
    assert client.post("/api/events", json=VALID_EVENT).status_code == 403

    database.set_role("grows.into.it@ku.th", "Lecturer")  # promoted while signed in
    assert client.post("/api/events", json=VALID_EVENT).status_code == 201

    database.set_role("grows.into.it@ku.th", "Student")  # and demoted again
    assert client.post("/api/events", json=VALID_EVENT).status_code == 403
    assert database.events() == 1


def test_a_role_in_a_request_header_or_body_is_ignored(client, sign_in, database):
    sign_in("just.a.student@ku.th")

    response = client.post(
        "/api/events",
        json={**VALID_EVENT, "created_by_role": "Admin", "role": "Admin"},
        headers={"X-User-Role": "Admin"},
    )

    assert response.status_code == 403
    assert database.events() == 0
    assert database.role_of("just.a.student@ku.th") == "Student"


def test_local_dev_sessions_keep_their_configured_role_and_skip_the_users_table(
    client, login_as, database
):
    login_as("Lecturer")

    created = client.post("/api/events", json=VALID_EVENT)

    assert created.status_code == 201
    assert client.get("/api/auth/me").json()["auth_mode"] == "signed-dev-session-not-for-production"
    assert database.users() == 0


def test_a_google_session_ends_when_its_domain_stops_being_allowed(
    client, sign_in, database, monkeypatch
):
    sign_in("navin.b@ku.th")
    monkeypatch.setattr(settings, "allowed_email_domain", "other.th")

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert database.users() == 0  # nobody outside the domain is ever stored
    monkeypatch.setattr(settings, "allowed_email_domain", "ku.th")
    assert client.get("/api/auth/me").status_code == 401  # and the session is gone


def test_provisioning_recovers_when_another_request_creates_the_user_first(
    session_factory, database, monkeypatch
):
    database.add_user("race@ku.th", "Lecturer")  # the "other request" got there first
    real_find = users_controller.find_user
    lookups = []

    def stale_then_real(db, email):
        lookups.append(email)
        return None if len(lookups) == 1 else real_find(db, email)

    monkeypatch.setattr(users_controller, "find_user", stale_then_real)

    with session_factory() as db:
        user = users_controller.get_or_provision_user(db, email="race@ku.th", name="Race")

    assert user.role == "Lecturer"
    assert database.users() == 1


# --- Enforced before anything is written ---------------------------------------

@pytest.mark.parametrize(
    ("role", "expected_status", "events_saved"),
    [
        (None, 401, 0),        # nobody signed in
        ("Student", 403, 0),
        ("TA", 201, 1),
        ("Lecturer", 201, 1),
        ("Admin", 201, 1),
    ],
)
def test_creating_an_event_for_every_role_and_for_nobody(
    client, sign_in, database, role, expected_status, events_saved
):
    if role is not None:
        sign_in(f"{role.lower()}@ku.th", stored_role=role)

    response = client.post("/api/events", json=VALID_EVENT)

    assert response.status_code == expected_status
    assert database.events() == events_saved


def test_the_role_is_checked_before_the_payload_is_read(client, sign_in):
    sign_in("student@ku.th")

    response = client.post("/api/events", content=b"{not json", headers={"Content-Type": "application/json"})

    assert response.status_code == 403
    assert response.json() == {"detail": "Students are not permitted to create events."}


def test_the_database_write_refuses_a_student_even_if_a_caller_forgets_the_route_check(
    session_factory, database
):
    payload = EventCreate.model_validate(VALID_EVENT)

    with session_factory() as db, pytest.raises(HTTPException) as denied:
        create_event(db, payload, staff(UserRole.STUDENT))

    assert denied.value.status_code == 403
    assert database.events() == 0


# Generating the schema warns about duplicate operation ids from the stacked route
# decorators in main.py, which this test does not care about.
@pytest.mark.filterwarnings("ignore:Duplicate Operation ID")
def test_every_write_endpoint_rejects_a_caller_who_is_not_signed_in(client):
    """Fails if someone adds a POST/PUT/PATCH/DELETE route without a permission check."""
    public = {("/api/auth/dev-login", "post"), ("/auth/logout", "post")}
    checked = []

    for path, operations in client.app.openapi()["paths"].items():
        for method in operations:
            if method not in {"post", "put", "patch", "delete"} or (path, method) in public:
                continue
            url = path.replace("{event_id}", "1")
            response = client.request(method.upper(), url, json={})
            assert response.status_code == 401, f"{method.upper()} {path} is not protected"
            checked.append((path, method))

    assert ("/api/events", "post") in checked


# --- Drafts follow the same stored role ----------------------------------------

def test_unpublished_events_follow_the_stored_role(client, sign_in, database):
    database.add_draft_event()
    sign_in("grows.into.it@ku.th")
    assert client.get("/api/events?include_drafts=true").status_code == 403

    database.set_role("grows.into.it@ku.th", "TA")

    drafts = client.get("/api/events?include_drafts=true")
    assert drafts.status_code == 200
    assert drafts.json()["count"] == 1


# --- Stored users ----------------------------------------------------------------

def test_assigning_a_role_creates_a_user_who_has_not_signed_in_yet(session_factory, database):
    with session_factory() as db:
        user, created = users_controller.assign_role(db, "  New.Lecturer@KU.th ", UserRole.LECTURER)

    assert created is True
    assert user.email == "new.lecturer@ku.th"
    assert database.role_of("new.lecturer@ku.th") == "Lecturer"


def test_assigning_a_role_updates_an_existing_user(session_factory, database):
    database.add_user("aj.milk@ku.th", "Student")

    with session_factory() as db:
        _, created = users_controller.assign_role(db, "aj.milk@ku.th", UserRole.ADMIN)

    assert created is False
    assert database.role_of("aj.milk@ku.th") == "Admin"
    assert database.users() == 1


def test_a_role_cannot_be_assigned_outside_the_allowed_domain(session_factory, database):
    with session_factory() as db, pytest.raises(users_controller.RoleAssignmentError):
        users_controller.assign_role(db, "someone@gmail.com", UserRole.ADMIN)

    assert database.users() == 0


def test_a_person_who_gets_a_role_before_signing_in_keeps_it_at_first_sign_in(
    client, sign_in, session_factory
):
    with session_factory() as db:
        users_controller.assign_role(db, "pre.assigned@ku.th", UserRole.LECTURER)

    sign_in("pre.assigned@ku.th")

    assert client.post("/api/events", json=VALID_EVENT).status_code == 201


# --- The users table ---------------------------------------------------------------

def test_the_database_rejects_a_role_that_does_not_exist(session_factory):
    with session_factory() as db:
        db.add(User(email="typo@ku.th", name="", role="lecturer"))  # wrong case
        with pytest.raises(IntegrityError):
            db.commit()


def test_the_roles_the_database_allows_are_the_roles_the_app_knows():
    assert set(ROLE_VALUES) == {role.value for role in UserRole}


def test_the_users_table_is_valid_postgresql():
    ddl = str(CreateTable(User.__table__).compile(dialect=postgresql.dialect()))

    assert "CONSTRAINT ck_users_role CHECK (role IN ('Student', 'TA', 'Lecturer', 'Admin'))" in ddl
    assert "email VARCHAR(320) NOT NULL" in ddl


# --- scripts/set_user_role.py ---------------------------------------------------------

def run_script(tmp_path, *args):
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{tmp_path / 'users.db'}"}
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        cwd=tmp_path,  # so a developer's real .env is never read
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


def stored_roles(tmp_path) -> dict[str, str]:
    engine = create_engine(f"sqlite:///{tmp_path / 'users.db'}")
    with engine.connect() as connection:
        rows = connection.execute(select(User.email, User.role)).all()
    engine.dispose()
    return dict(rows)


def test_the_script_creates_and_then_updates_a_user(tmp_path):
    created = run_script(tmp_path, "lecturer@ku.th", "Lecturer")
    updated = run_script(tmp_path, "lecturer@ku.th", "admin")  # role names ignore case

    assert created.returncode == 0 and "Created lecturer@ku.th as Lecturer." in created.stdout
    assert updated.returncode == 0 and "Updated lecturer@ku.th as Admin." in updated.stdout
    assert stored_roles(tmp_path) == {"lecturer@ku.th": "Admin"}


def test_the_script_refuses_an_address_outside_the_domain(tmp_path):
    result = run_script(tmp_path, "someone@gmail.com", "Admin")

    assert result.returncode == 1
    assert "not an @ku.th address" in result.stderr
    assert stored_roles(tmp_path) == {}


def test_the_script_refuses_an_unknown_role(tmp_path):
    result = run_script(tmp_path, "someone@ku.th", "Dean")

    assert result.returncode == 2
    assert "unknown role" in result.stderr
