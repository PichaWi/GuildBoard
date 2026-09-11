from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from src.config import settings, validate_session_secret

# main.py captures this exact key for SessionMiddleware at import time. Tests set a
# strong, isolated value explicitly rather than relying on a public/default secret.
settings.environment = "test"
settings.session_secret = "guildboard-tests-only-session-secret-2026"

from src.database import Base, get_db
from src.main import app
from src.models.event import Event


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def override_get_db() -> Iterator[Session]:
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


VALID_EVENT = {
    "title": "Architecture Review",
    "course_code": "ISP",
    "event_type": "Project Milestone",
    "event_date": "2026-10-20",
    "start_time": "10:00",
    "end_time": "12:00",
    "location": "Room 402",
    "instructor": "Aj. Hutchathai",
    "description": "Review the Stage 2 component diagrams.",
    "publish_immediately": True,
    "notify_email": False,
}

STUDENT_LOGIN = {"email": "student.test@ku.th", "password": "student-test-password"}
LECTURER_LOGIN = {"email": "lecturer.test@ku.th", "password": "lecturer-test-password"}


@pytest.mark.parametrize(
    "secret",
    [
        "",
        "too-short",
        "dev-only-insecure-session-secret",
        "replace-with-a-long-random-secret",
        "change-me-please-this-value-is-public-and-long",
    ],
)
def test_session_secret_rejects_missing_short_and_placeholder_values(secret: str) -> None:
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        validate_session_secret(secret)


def test_session_secret_accepts_strong_value() -> None:
    validate_session_secret("6D7!pN3@hK9#vQ2$mT8&xR4*zW1_cF5+")


@pytest.fixture(autouse=True)
def configure_test_app(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setattr(settings, "environment", "test")
    monkeypatch.setattr(settings, "dev_login_enabled", True)
    monkeypatch.setattr(settings, "demo_student_email", STUDENT_LOGIN["email"])
    monkeypatch.setattr(settings, "demo_student_password", STUDENT_LOGIN["password"])
    monkeypatch.setattr(settings, "demo_lecturer_email", LECTURER_LOGIN["email"])
    monkeypatch.setattr(settings, "demo_lecturer_password", LECTURER_LOGIN["password"])
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    app.dependency_overrides.clear()


def login(client: TestClient, credentials: dict[str, str]) -> dict[str, str]:
    response = client.post("/api/auth/dev-login", json=credentials)
    assert response.status_code == 200
    return response.json()


def test_unauthenticated_requests_receive_401() -> None:
    with TestClient(app) as client:
        me = client.get("/api/auth/me")
        create = client.post("/api/events", json=VALID_EVENT)

    assert me.status_code == 401
    assert create.status_code == 401


def test_student_cannot_escalate_role_with_spoofed_header() -> None:
    with TestClient(app) as client:
        user = login(client, STUDENT_LOGIN)
        response = client.post(
            "/api/events",
            json=VALID_EVENT,
            headers={"X-User-Role": "Lecturer"},
        )

    assert user["role"] == "Student"
    assert response.status_code == 403
    assert response.json() == {"detail": "Students are not permitted to create events."}
    with TestingSession() as db:
        assert db.scalar(select(Event)) is None


def test_lecturer_session_can_create_and_persist_event() -> None:
    with TestClient(app) as client:
        user = login(client, LECTURER_LOGIN)
        me = client.get("/api/auth/me", headers={"X-User-Role": "Student"})
        response = client.post("/api/events", json=VALID_EVENT)

    assert user["role"] == "Lecturer"
    assert user["auth_mode"] == "signed-dev-session-not-for-production"
    assert me.status_code == 200
    assert me.json()["role"] == "Lecturer"
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == VALID_EVENT["title"]
    assert body["created_by_role"] == "Lecturer"

    with TestingSession() as db:
        saved = db.scalar(select(Event))
        assert saved is not None
        assert saved.created_by_role == "Lecturer"


def test_dev_login_rejects_bad_credentials_and_disabled_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with TestClient(app) as client:
        bad_credentials = client.post(
            "/api/auth/dev-login",
            json={"email": STUDENT_LOGIN["email"], "password": "wrong"},
        )
        monkeypatch.setattr(settings, "dev_login_enabled", False)
        disabled = client.post("/api/auth/dev-login", json=STUDENT_LOGIN)
        monkeypatch.setattr(settings, "dev_login_enabled", True)
        monkeypatch.setattr(settings, "environment", "production")
        production = client.post("/api/auth/dev-login", json=STUDENT_LOGIN)

    assert bad_credentials.status_code == 401
    assert disabled.status_code == 403
    assert production.status_code == 403


def test_tampered_session_cookie_is_rejected() -> None:
    with TestClient(app) as client:
        login(client, LECTURER_LOGIN)
        signed_cookie = client.cookies.get("guildboard_session")
        assert signed_cookie is not None
        client.cookies.set("guildboard_session", f"{signed_cookie}tampered")
        response = client.get("/api/auth/me")

    assert response.status_code == 401
