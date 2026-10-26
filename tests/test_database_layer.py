"""Database layer: tables, constraints, migrations, seed data and the driver fix."""
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateTable

from src.config import settings
from src.database import Base
from src.models import ConsultationCreate, CourseMaterial

ROOT = Path(__file__).resolve().parent.parent
TABLES = {"users", "events", "tickets", "consultation_sessions", "course_materials"}


def test_every_table_is_registered():
    assert TABLES <= set(Base.metadata.tables)


def test_every_table_is_valid_postgresql():
    for name in TABLES:
        CreateTable(Base.metadata.tables[name]).compile(dialect=postgresql.dialect())


def test_consultation_requires_student_topic_and_time():
    with pytest.raises(ValidationError):
        ConsultationCreate(student_name="Sarah", topic="", session_at=datetime.now(timezone.utc))
    with pytest.raises(ValidationError):
        ConsultationCreate(student_name="", topic="MVC", session_at=datetime.now(timezone.utc))


def test_a_material_version_cannot_be_saved_twice(session_factory):
    with session_factory() as db:
        for _ in range(2):
            db.add(CourseMaterial(material_key="guide", version=1, title="Guide", uploaded_by="lecturer"))
        with pytest.raises(IntegrityError):
            db.commit()


def test_migrations_build_the_same_schema_as_the_models(tmp_path, monkeypatch):
    from alembic import command
    from alembic.config import Config

    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    monkeypatch.setattr(settings, "database_url", url)
    command.upgrade(Config(str(ROOT / "alembic.ini")), "head")

    inspector = inspect(create_engine(url))
    assert TABLES <= set(inspector.get_table_names())
    for name in TABLES:
        migrated = {c["name"] for c in inspector.get_columns(name)}
        assert migrated == set(Base.metadata.tables[name].columns.keys()), name


def test_seed_runs_twice_without_duplicates_and_flags_at_risk(tmp_path):
    db_file = tmp_path / "seed.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db_file}"}

    def run():
        return subprocess.run([sys.executable, str(ROOT / "scripts" / "seed_data.py")],
                              env=env, capture_output=True, text=True, cwd=ROOT)

    first, second = run(), run()
    assert first.returncode == 0, first.stderr
    assert "added 4 users, 4 events, 3 materials, 5 tickets, 3 consultations" in first.stdout
    assert "added 0 users, 0 events, 0 materials, 0 tickets, 0 consultations" in second.stdout

    # The seeded tickets include one overdue and one due within 48 h (US-4 demo data).
    check = subprocess.run([sys.executable, "-c", (
        "from datetime import datetime, timezone;"
        "from src.database import SessionLocal;"
        "from src.controllers.at_risk import list_at_risk;"
        "db=SessionLocal(); print(len(list_at_risk(db, datetime.now(timezone.utc))))")],
        env=env, capture_output=True, text=True, cwd=ROOT)
    assert check.stdout.strip() == "2", check.stderr


@pytest.mark.parametrize("given", ["postgres://u:p@h/db", "postgresql://u:p@h/db"])
def test_postgres_urls_use_the_installed_psycopg2_driver(given, monkeypatch):
    monkeypatch.setattr(settings, "database_url", given)
    assert settings.sqlalchemy_url == "postgresql+psycopg2://u:p@h/db"
