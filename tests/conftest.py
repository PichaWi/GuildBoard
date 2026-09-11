"""Shared test setup.

This runs before any test module imports the app, which matters because
src.main captures SESSION_SECRET at import time. It also puts the project root
on sys.path so plain `pytest` works, not only `python -m pytest`.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Tests must never reach a real database or depend on a developer's .env.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SESSION_SECRET"] = "guildboard-conftest-session-secret-2026"
os.environ["ENVIRONMENT"] = "test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

DEMO_ACCOUNTS = {
    "Student": ("student.test@ku.th", "student-test-password"),
    "Lecturer": ("lecturer.test@ku.th", "lecturer-test-password"),
}


@pytest.fixture
def session_factory():
    """A fresh in-memory database per test."""
    import src.models  # noqa: F401  (registers the tables on Base)
    from src.database import Base

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def client(session_factory, monkeypatch):
    """A TestClient wired to the per-test database, with dev login enabled."""
    from src.config import settings
    from src.database import get_db
    from src.main import app

    monkeypatch.setattr(settings, "environment", "test")
    monkeypatch.setattr(settings, "dev_login_enabled", True)
    monkeypatch.setattr(settings, "demo_student_email", DEMO_ACCOUNTS["Student"][0])
    monkeypatch.setattr(settings, "demo_student_password", DEMO_ACCOUNTS["Student"][1])
    monkeypatch.setattr(settings, "demo_lecturer_email", DEMO_ACCOUNTS["Lecturer"][0])
    monkeypatch.setattr(settings, "demo_lecturer_password", DEMO_ACCOUNTS["Lecturer"][1])

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def login_as(client):
    """Sign the client in through the existing dev login as "Student" or "Lecturer"."""

    def _login(role: str) -> dict:
        email, password = DEMO_ACCOUNTS[role]
        response = client.post("/api/auth/dev-login", json={"email": email, "password": password})
        assert response.status_code == 200, response.text
        return response.json()

    return _login
