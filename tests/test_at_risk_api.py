"""At-risk monitor (US-4): overdue or nearly due tickets are flagged automatically.

The rule: not Closed, and due less than 48 hours from now or already past.
"""
from datetime import datetime, timedelta, timezone

import pytest

from src.controllers.at_risk import AT_RISK_WINDOW, is_at_risk, list_at_risk, utcnow
from src.models.ticket import Ticket
from src.models.user import User

NOW = datetime(2026, 10, 25, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def frozen_now(client):
    """Make the endpoint see NOW as the current time."""
    client.app.dependency_overrides[utcnow] = lambda: NOW
    return NOW


@pytest.fixture
def sign_in(client, google, session_factory):
    def _sign_in(role: str) -> None:
        email = f"{role.lower()}@ku.th"
        with session_factory() as db:
            db.add(User(email=email, name=role, role=role))
            db.commit()
        google({"email": email, "email_verified": True, "name": role})
        assert client.get("/auth/callback", follow_redirects=False).status_code == 303

    return _sign_in


def add_ticket(session_factory, title: str, due_in: timedelta, status: str = "Open") -> int:
    with session_factory() as db:
        ticket = Ticket(
            title=title,
            owner="Aj. Tem",
            status=status,
            due_at=NOW + due_in,
            created_by="lecturer@ku.th",
        )
        db.add(ticket)
        db.commit()
        return ticket.id


def ticket(due_in: timedelta, status: str = "Open") -> Ticket:
    return Ticket(title="t", owner="o", status=status, due_at=NOW + due_in, created_by="x@ku.th")


# --- The rule -------------------------------------------------------------------

@pytest.mark.parametrize(
    "due_in, status, expected",
    [
        (timedelta(hours=47), "Open", True),  # TC-08: due within 48 h
        (timedelta(hours=-3), "Open", True),  # TC-08: overdue
        (timedelta(hours=49), "Open", False),  # TC-08: not yet
        (timedelta(hours=-3), "Closed", False),  # TC-08: closed and overdue
        (timedelta(hours=10), "In-Progress", True),  # in progress still counts as open
        (timedelta(hours=10), "Closed", False),
        (timedelta(0), "Open", True),  # due right now
        (AT_RISK_WINDOW - timedelta(seconds=1), "Open", True),
        (AT_RISK_WINDOW, "Open", False),  # exactly 48 h away is not yet at risk
    ],
)
def test_the_at_risk_rule(due_in, status, expected):
    assert is_at_risk(ticket(due_in, status), NOW) is expected


def test_a_naive_due_time_from_sqlite_is_read_as_utc():
    naive = Ticket(title="t", owner="o", status="Open", due_at=datetime(2026, 10, 26, 12, 0), created_by="x")

    assert is_at_risk(naive, NOW)  # 24 h away in UTC


def test_the_query_returns_the_same_tickets_as_the_rule(session_factory):
    cases = [timedelta(hours=h) for h in (-72, -1, 0, 1, 47, 48, 49, 200)]
    for index, due_in in enumerate(cases):
        add_ticket(session_factory, f"open {index}", due_in)
        add_ticket(session_factory, f"closed {index}", due_in, status="Closed")

    with session_factory() as db:
        flagged = {t.title for t in list_at_risk(db, NOW)}
        everything = db.query(Ticket).all()
        by_rule = {t.title for t in everything if is_at_risk(t, NOW)}

    assert flagged == by_rule == {"open 0", "open 1", "open 2", "open 3", "open 4"}


# --- GET /api/at-risk -----------------------------------------------------------

def test_the_monitor_lists_overdue_and_nearing_tickets_soonest_first(
    client, sign_in, session_factory, frozen_now
):
    soon = add_ticket(session_factory, "Due in 47 h", timedelta(hours=47))
    late = add_ticket(session_factory, "Overdue", timedelta(hours=-26))
    add_ticket(session_factory, "Due in 49 h", timedelta(hours=49))
    add_ticket(session_factory, "Closed and overdue", timedelta(hours=-5), status="Closed")
    sign_in("Lecturer")

    response = client.get("/api/at-risk")

    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["count"], body["overdue"], body["nearing"]) == (2, 1, 1)
    assert [item["id"] for item in body["items"]] == [late, soon]

    overdue, nearing = body["items"]
    assert overdue["risk_type"] == "overdue"
    assert overdue["hours_until_due"] == -26
    assert nearing["risk_type"] == "nearing"
    assert nearing["hours_until_due"] == 47
    # Each item carries the ticket fields too, so the tab needs one request.
    assert nearing["title"] == "Due in 47 h"
    assert nearing["owner"] == "Aj. Tem"
    assert nearing["status"] == "Open"


def test_closing_a_ticket_takes_it_off_the_monitor(client, sign_in, session_factory, frozen_now):
    ticket_id = add_ticket(session_factory, "Overdue", timedelta(hours=-2))
    sign_in("TA")
    assert client.get("/api/at-risk").json()["count"] == 1

    assert client.patch(f"/api/tickets/{ticket_id}", json={"status": "Closed"}).status_code == 200

    assert client.get("/api/at-risk").json() == {"count": 0, "overdue": 0, "nearing": 0, "items": []}


@pytest.mark.parametrize("role", ["TA", "Lecturer", "Admin"])
def test_staff_can_view_the_monitor(client, sign_in, frozen_now, role):
    sign_in(role)

    assert client.get("/api/at-risk").status_code == 200


def test_a_student_cannot_view_the_monitor(client, sign_in, session_factory, frozen_now):
    add_ticket(session_factory, "Overdue", timedelta(hours=-2))
    sign_in("Student")

    response = client.get("/api/at-risk")

    assert response.status_code == 403
    assert response.json() == {"detail": "Only Lecturers, TAs and Admins can view at-risk items."}


def test_nobody_signed_in_cannot_view_the_monitor(client):
    assert client.get("/api/at-risk").status_code == 401


def test_the_monitor_uses_the_real_clock_by_default(client, sign_in, session_factory):
    with session_factory() as db:
        db.add(
            Ticket(
                title="Due in an hour",
                owner="Aj. Milk",
                due_at=datetime.now(timezone.utc) + timedelta(hours=1),
                created_by="lecturer@ku.th",
            )
        )
        db.commit()
    sign_in("TA")

    body = client.get("/api/at-risk").json()

    assert body["count"] == 1
    assert body["items"][0]["risk_type"] == "nearing"
