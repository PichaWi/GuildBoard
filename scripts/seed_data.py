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
from src.models import ConsultationSession, CourseMaterial, Event, Ticket, TicketComment, User  # noqa: E402

# The Student and Lecturer emails match .env.example's DEMO_* accounts.
USERS = [
    ("lecturer.demo@ku.th", "Aj. Hutchathai", "Lecturer"),
    ("lecturer2.demo@ku.th", "Aj. Suwichak", "Lecturer"),
    ("lecturer3.demo@ku.th", "Aj. Chantana", "Lecturer"),
    ("lecturer4.demo@ku.th", "Aj. Pajee", "Lecturer"),
    ("ta.demo@ku.th", "Alex Chen", "TA"),
    ("ta2.demo@ku.th", "Prima X", "TA"),
    ("ta3.demo@ku.th", "Picha W", "TA"),
    ("student.demo@ku.th", "Sarah Jenkins", "Student"),
    ("student2.demo@ku.th", "Alexei Kozlov", "Student"),
    ("student3.demo@ku.th", "John Doe", "Student"),
    ("admin.demo@ku.th", "System Admin", "Admin"),
]


OWNER_EMAILS = {"Picha W": "ta3.demo@ku.th", "Prima X": "ta2.demo@ku.th"}


def is_empty(db, model) -> bool:
    return db.scalar(select(func.count()).select_from(model)) == 0


def seed(db) -> dict[str, int]:
    added = dict.fromkeys(
        ["users", "events", "materials", "tickets", "consultations", "comments"], 0)
    now = datetime.now(timezone.utc)
    today = date.today()

    # Upsert users (update name/role if email exists)
    for email, name, role in USERS:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            db.add(User(email=email, name=name, role=role))
            added["users"] += 1
        else:
            user.name = name
            user.role = role
    db.flush()

    # Seed events (idempotent: check by title)
    event_data = [
        ("Software Communication Skills", "SCS", "Lecture & Workshop", 2, True, "Aj. Chantana"),
        ("KE: Ontology & Model Milestone", "KE", "Project Milestone", 4, True, "Aj. Hutchathai"),
        ("ISP Milestone 2: Architecture Review",
         "ISP", "Project Milestone", 7, True, "Aj. Suwichak"),
        ("ISP Iteration 5 Planning (draft)", "ISP", "Lab Session", 10, False, "Aj. Suwichak"),
        ("Folk Music Quiz", "FM", "Lecture", 15, True, "Aj. Pajee"),
        ("ISP Lab & Process Check", "ISP", "Assignment Due", 20, True, "Aj. Suwichak"),
        ("KE Ontology Design Submission", "KE", "Assignment Due", 25, True, "Aj. Hutchathai"),
        ("FM Lecture", "FM", "Final Exam", 30, True, "Aj. Pajee"),
        ("ISP Code Quality Submission", "ISP", "Assignment Due", 1, True, "Aj. Suwichak"),
    ]
    for title, course, kind, days, published, instructor in event_data:
        existing = db.scalar(select(Event).where(Event.title == title))
        if existing is None:
            db.add(Event(
                title=title, course_code=course, event_type=kind,
                event_date=today + timedelta(days=days), start_time=time(9), end_time=time(12),
                location="Room 203", instructor=instructor, description="",
                publish_immediately=published, created_by_role="Lecturer",
            ))
            added["events"] += 1
    db.flush()

    # Seed materials (idempotent: check by material_key + version)
    first_event = db.scalar(select(Event).order_by(Event.id))
    for key, version, title, published in [
        ("isp-architecture-guide", 1, "ISP Architecture Guidelines", False),
        # latest published
        ("isp-architecture-guide", 2, "ISP Architecture Guidelines", True),
        ("ke-ontology-slides", 1, "KE Ontology Lecture Slides", True),
    ]:
        existing = db.scalar(select(CourseMaterial).where(
            CourseMaterial.material_key == key, CourseMaterial.version == version))
        if existing is None:
            db.add(CourseMaterial(
                material_key=key, version=version, title=title, course_code=title.split()[
                    0],
                file_name=f"{key}-v{version}.pdf", file_size_bytes=1_400_000, is_published=published,
                event_id=first_event.id if first_event else None, uploaded_by="lecturer.demo@ku.th",
            ))
            added["materials"] += 1

    # Seed tickets (idempotent: check by title)
    for title, owner, priority, status, hours in [
        ("ISP Milestone 2 Code Review", "Picha W", "High",
         "In-Progress", 20),        # at risk: due < 48 h
        ("KE Ontology Schema Check", "Prima X",
         "Medium", "Open", 24 * 5),          # normal
        ("SCS Lab Presentation Rubric", "Picha W", "Low",
         "Closed", -24 * 3),         # closed: never at risk
        ("FM Essay Feedback Sync", "Prima X", "High",
         "Open", -30),                 # at risk: overdue
        ("Architecture Consultation Prep",
         "Picha W", "Medium", "In-Progress", 24 * 4),
    ]:
        existing = db.scalar(select(Ticket).where(Ticket.title == title))
        if existing is None:
            db.add(Ticket(
                title=title, owner=owner, owner_role="TA", owner_email=OWNER_EMAILS.get(owner, ""),
                priority=priority, status=status,
                due_at=now + timedelta(hours=hours), created_by="lecturer.demo@ku.th",
            ))
            added["tickets"] += 1
    db.flush()

    # Seed comments (idempotent: check by ticket_id + body prefix)
    tickets = db.scalars(select(Ticket)).all()
    if tickets:
        ta_user = db.scalar(select(User).where(User.email == "ta.demo@ku.th"))
        lecturer_user = db.scalar(select(User).where(User.email == "lecturer.demo@ku.th"))
        for i, ticket in enumerate(tickets[:3]):
            body = f"Demo comment {i+1} on ticket '{ticket.title}' by "
            author = ta_user if i % 2 == 0 else lecturer_user
            if author:
                existing = db.scalar(select(TicketComment).where(
                    TicketComment.ticket_id == ticket.id,
                    TicketComment.body.like(f"{body}%")
                ))
                if existing is None:
                    db.add(TicketComment(
                        ticket_id=ticket.id,
                        author_id=author.id,
                        body=f"{body}{author.name}.",
                    ))
                    added["comments"] += 1

    # Seed consultations (idempotent: check by student_id + topic)
    for name, sid, course, topic, days in [
        ("Sarah Jenkins", "64010892", "ISP",
         "MVC layering for the architecture submission", -2),
        ("Alexei Kozlov", "64010915", "KE",
         "OWL restrictions and competency questions", -1),
        ("Sarah Jenkins", "64010892", "ISP", "Sequence diagram error path", 0),
    ]:
        session_at = now + timedelta(days=days)
        existing = db.scalar(select(ConsultationSession).where(
            ConsultationSession.student_id == sid,
            ConsultationSession.topic == topic,
        ))
        if existing is None:
            db.add(ConsultationSession(
                student_name=name, student_id=sid, course_code=course, topic=topic,
                session_at=session_at, notes="Demo record from seed_data.py",
                recorded_by="ta.demo@ku.th",
            ))
            added["consultations"] += 1

    db.commit()
    return added


def main() -> int:
    init_db()  # creates tables only for the SQLite fallback; PostgreSQL uses Alembic
    with SessionLocal() as db:
        added = seed(db)
    print("Seed complete: added " +
          ", ".join(f"{n} {k}" for k, n in added.items()) + ".")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())