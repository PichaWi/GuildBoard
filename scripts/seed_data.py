#!/usr/bin/env python3
"""Fill the database with demo data so every page has something real to show.

Safe to run more than once: users are matched by email, and the other tables
are only filled when they are empty. Dates are relative to today, so the
calendar and the at-risk monitor always have current items.

    python scripts/seed_data.py
"""
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select  # noqa: E402

from src.database import SessionLocal, init_db  # noqa: E402
from src.models import ConsultationSession, CourseMaterial, Event, Ticket, User  # noqa: E402

# The Student and Lecturer emails match .env.example's DEMO_* accounts.
USERS = [
    ("lecturer.demo@ku.th", "Aj. Milk", "Lecturer"),
    ("ta.demo@ku.th", "Alex Chen", "TA"),
    ("student.demo@ku.th", "Sarah Jenkins", "Student"),
    ("admin.demo@ku.th", "System Admin", "Admin"),
]


def is_empty(db, model) -> bool:
    return db.scalar(select(func.count()).select_from(model)) == 0


def seed(db) -> dict[str, int]:
    added = dict.fromkeys(["users", "events", "materials", "tickets", "consultations"], 0)
    now = datetime.now(timezone.utc)
    today = date.today()

    for email, name, role in USERS:
        if db.scalar(select(User).where(User.email == email)) is None:
            db.add(User(email=email, name=name, role=role))
            added["users"] += 1
    db.flush()

    if is_empty(db, Event):
        for title, course, kind, days, published in [
            ("Software Communication Skills", "SCS", "Lecture & Workshop", 2, True),
            ("KE: Ontology & Model Milestone", "KE", "Project Milestone", 4, True),
            ("ISP Milestone 2: Architecture Review", "ISP", "Project Milestone", 7, True),
            ("ISP Iteration 5 Planning (draft)", "ISP", "Lab Session", 10, False),
        ]:
            db.add(Event(
                title=title, course_code=course, event_type=kind,
                event_date=today + timedelta(days=days), start_time=time(9), end_time=time(12),
                location="Room 203", instructor="Aj. Milk", description="",
                publish_immediately=published, created_by_role="Lecturer",
            ))
            added["events"] += 1
        db.flush()

    if is_empty(db, CourseMaterial):
        first_event = db.scalar(select(Event).order_by(Event.id))
        for key, version, title, published in [
            ("isp-architecture-guide", 1, "ISP Architecture Guidelines", False),
            ("isp-architecture-guide", 2, "ISP Architecture Guidelines", True),  # latest published
            ("ke-ontology-slides", 1, "KE Ontology Lecture Slides", True),
        ]:
            db.add(CourseMaterial(
                material_key=key, version=version, title=title, course_code=title.split()[0],
                file_name=f"{key}-v{version}.pdf", file_size_bytes=1_400_000, is_published=published,
                event_id=first_event.id if first_event else None, uploaded_by="lecturer.demo@ku.th",
            ))
            added["materials"] += 1

    if is_empty(db, Ticket):
        for title, owner, priority, status, hours in [
            ("ISP Milestone 2 Code Review", "Alex Chen", "High", "In-Progress", 20),        # at risk: due < 48 h
            ("KE Ontology Schema Check", "Ploy Srisuk", "Medium", "Open", 24 * 5),          # normal
            ("SCS Lab Presentation Rubric", "Alex Chen", "Low", "Closed", -24 * 3),         # closed: never at risk
            ("FM Essay Feedback Sync", "Ploy Srisuk", "High", "Open", -30),                 # at risk: overdue
            ("Architecture Consultation Prep", "Alex Chen", "Medium", "In-Progress", 24 * 4),
        ]:
            db.add(Ticket(
                title=title, owner=owner, owner_role="TA", priority=priority, status=status,
                due_at=now + timedelta(hours=hours), created_by="lecturer.demo@ku.th",
            ))
            added["tickets"] += 1

    if is_empty(db, ConsultationSession):
        for name, sid, course, topic, days in [
            ("Sarah Jenkins", "64010892", "ISP", "MVC layering for the architecture submission", -2),
            ("Alexei Kozlov", "64010915", "KE", "OWL restrictions and competency questions", -1),
            ("Sarah Jenkins", "64010892", "ISP", "Sequence diagram error path", 0),
        ]:
            db.add(ConsultationSession(
                student_name=name, student_id=sid, course_code=course, topic=topic,
                session_at=now + timedelta(days=days), notes="Demo record from seed_data.py",
                recorded_by="ta.demo@ku.th",
            ))
            added["consultations"] += 1

    db.commit()
    return added


def main() -> int:
    init_db()  # creates tables only for the SQLite fallback; PostgreSQL uses Alembic
    with SessionLocal() as db:
        added = seed(db)
    print("Seed complete: added " + ", ".join(f"{n} {k}" for k, n in added.items()) + ".")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
