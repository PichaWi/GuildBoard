from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateTable

from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.tickets import create_ticket, update_ticket
from src.models.ticket import PRIORITY_VALUES, STATUS_VALUES, Ticket, TicketCreate, TicketUpdate
from src.models.user import User

VALID_TICKET = {
    "title": "ISP Milestone 2 Code Review",
    "owner": "Alex Chen",
    "owner_role": "Teaching Assistant",
    "priority": "High",
    "status": "Open",
    "due_at": "2026-10-28T17:00:00+07:00",
    "description": "Check the architecture diagrams.",
}


@pytest.fixture
def sign_in(client, google, session_factory):
    def _sign_in(role: str, email: str | None = None) -> str:
        email = email or f"{role.lower()}@ku.th"
        with session_factory() as db:
            db.add(User(email=email, name=role, role=role))
            db.commit()
        google({"email": email, "email_verified": True, "name": role})
        response = client.get("/auth/callback", follow_redirects=False)
        assert response.status_code == 303, response.text
        return email

    return _sign_in


def ticket_count(session_factory) -> int:
    with session_factory() as db:
        return db.scalar(select(func.count()).select_from(Ticket))


def add_ticket(session_factory, **overrides) -> int:
    values = {
        "title": "Rubric check",
        "owner": "Aj. Tem",
        "priority": "Medium",
        "status": "Open",
        "due_at": datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc),
        "created_by": "lecturer@ku.th",
        **overrides,
    }
    with session_factory() as db:
        ticket = Ticket(**values)
        db.add(ticket)
        db.commit()
        return ticket.id


def someone(role: UserRole) -> AuthenticatedUser:
    return AuthenticatedUser("someone@ku.th", "Someone", role, "test")


# --- Create ---------------------------------------------------------------------

@pytest.mark.parametrize("role", ["TA", "Lecturer", "Admin"])
def test_staff_can_create_a_ticket(client, sign_in, session_factory, role):
    email = sign_in(role)

    response = client.post("/api/tickets", json=VALID_TICKET)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == VALID_TICKET["title"]
    assert body["owner"] == "Alex Chen"
    assert body["priority"] == "High"
    assert body["status"] == "Open"
    assert body["created_by"] == email
    assert ticket_count(session_factory) == 1


def test_the_due_time_is_stored_and_returned_in_utc(client, sign_in):
    sign_in("TA")

    body = client.post("/api/tickets", json=VALID_TICKET).json()

    assert datetime.fromisoformat(body["due_at"]) == datetime(2026, 10, 28, 10, 0, tzinfo=timezone.utc)


def test_a_date_without_a_time_is_accepted_as_midnight_utc(client, sign_in):
    sign_in("TA")

    response = client.post("/api/tickets", json={**VALID_TICKET, "due_at": "2026-10-28"})

    assert response.status_code == 201, response.text
    assert datetime.fromisoformat(response.json()["due_at"]) == datetime(2026, 10, 28, tzinfo=timezone.utc)


def test_priority_and_status_default_to_medium_and_open(client, sign_in):
    sign_in("TA")
    minimal = {"title": "Lab prep", "owner": "Aj. Milk", "due_at": "2026-10-28T09:00:00Z"}

    body = client.post("/api/tickets", json=minimal).json()

    assert body["priority"] == "Medium"
    assert body["status"] == "Open"
    assert body["description"] == ""


def test_a_student_cannot_create_a_ticket(client, sign_in, session_factory):
    sign_in("Student")

    response = client.post("/api/tickets", json=VALID_TICKET)

    assert response.status_code == 403
    assert response.json() == {"detail": "Students are not permitted to create tickets."}
    assert ticket_count(session_factory) == 0


def test_nobody_signed_in_cannot_create_a_ticket(client, session_factory):
    response = client.post("/api/tickets", json=VALID_TICKET)

    assert response.status_code == 401
    assert ticket_count(session_factory) == 0


def test_the_role_is_checked_before_the_body_is_read(client, sign_in):
    sign_in("Student")

    response = client.post(
        "/api/tickets", content=b"{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 403


def test_a_role_in_the_body_or_a_header_is_ignored(client, sign_in, session_factory):
    sign_in("Student")

    response = client.post(
        "/api/tickets", json={**VALID_TICKET, "role": "Admin"}, headers={"X-User-Role": "Admin"}
    )

    assert response.status_code == 403
    assert ticket_count(session_factory) == 0


def test_missing_required_fields_are_listed(client, sign_in, session_factory):
    sign_in("TA")

    response = client.post("/api/tickets", json={"title": "  ", "priority": "High"})

    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "REQUIRED_FIELDS_MISSING"
    assert body["missing_fields"] == ["title", "owner", "due_at"]
    assert ticket_count(session_factory) == 0


@pytest.mark.parametrize(
    "field, value",
    [
        ("priority", "Urgent"),
        ("status", "Done"),
        ("due_at", "next Friday"),
        ("title", "x" * 121),
    ],
)
def test_invalid_values_are_rejected(client, sign_in, session_factory, field, value):
    sign_in("TA")

    response = client.post("/api/tickets", json={**VALID_TICKET, field: value})

    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_FIELD_FORMAT"
    assert field in response.json()["detail"]
    assert ticket_count(session_factory) == 0


def test_the_database_write_refuses_a_student_even_if_a_caller_forgets_the_route_check(
    session_factory,
):
    payload = TicketCreate.model_validate(VALID_TICKET)

    with session_factory() as db, pytest.raises(HTTPException) as denied:
        create_ticket(db, payload, someone(UserRole.STUDENT))

    assert denied.value.status_code == 403
    assert ticket_count(session_factory) == 0


# --- List -----------------------------------------------------------------------

def test_tickets_are_listed_soonest_due_first(client, sign_in, session_factory):
    later = add_ticket(session_factory, title="Later", due_at=datetime(2026, 11, 5, tzinfo=timezone.utc))
    sooner = add_ticket(session_factory, title="Sooner", due_at=datetime(2026, 10, 27, tzinfo=timezone.utc))
    sign_in("Lecturer")

    response = client.get("/api/tickets")

    assert response.status_code == 200
    assert [ticket["id"] for ticket in response.json()] == [sooner, later]


def test_tickets_can_be_filtered_by_status(client, sign_in, session_factory):
    add_ticket(session_factory, status="Open")
    closed = add_ticket(session_factory, status="Closed")
    sign_in("TA")

    response = client.get("/api/tickets", params={"status": "Closed"})

    assert response.status_code == 200
    assert [ticket["id"] for ticket in response.json()] == [closed]


def test_an_unknown_status_filter_is_rejected(client, sign_in):
    sign_in("TA")

    assert client.get("/api/tickets", params={"status": "Done"}).status_code == 422


def test_an_empty_list_when_there_are_no_tickets(client, sign_in):
    sign_in("Admin")

    response = client.get("/api/tickets")

    assert response.status_code == 200
    assert response.json() == []


def test_students_and_nobody_cannot_list_tickets(client, sign_in, session_factory):
    add_ticket(session_factory)

    assert client.get("/api/tickets").status_code == 401
    sign_in("Student")
    response = client.get("/api/tickets")
    assert response.status_code == 403
    assert response.json() == {"detail": "Only Lecturers, TAs and Admins can view tickets."}


def test_staff_can_change_a_ticket_status(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, status="Open", priority="Low")
    sign_in("TA")

    response = client.patch(f"/api/tickets/{ticket_id}", json={"status": "In-Progress"})

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "In-Progress"
    # Fields that were not sent are left as they were.
    assert response.json()["priority"] == "Low"
    with session_factory() as db:
        assert db.get(Ticket, ticket_id).status == "In-Progress"


def test_several_fields_can_be_changed_at_once(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory)
    sign_in("Lecturer")

    response = client.patch(
        f"/api/tickets/{ticket_id}",
        json={"owner": "Aj. Pajee", "priority": "High", "due_at": "2026-11-01T12:00:00Z"},
    )

    body = response.json()
    assert response.status_code == 200
    assert (body["owner"], body["priority"]) == ("Aj. Pajee", "High")
    assert datetime.fromisoformat(body["due_at"]) == datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)


def test_the_description_can_be_cleared(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, description="old notes")
    sign_in("TA")

    response = client.patch(f"/api/tickets/{ticket_id}", json={"description": None})

    assert response.status_code == 200
    assert response.json()["description"] == ""


def test_a_required_field_cannot_be_cleared(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, title="Keep me")
    sign_in("TA")

    response = client.patch(f"/api/tickets/{ticket_id}", json={"title": None})

    assert response.status_code == 422
    with session_factory() as db:
        assert db.get(Ticket, ticket_id).title == "Keep me"


def test_an_invalid_status_is_not_saved(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, status="Open")
    sign_in("TA")

    response = client.patch(f"/api/tickets/{ticket_id}", json={"status": "Done"})

    assert response.status_code == 422
    with session_factory() as db:
        assert db.get(Ticket, ticket_id).status == "Open"


def test_updating_a_missing_ticket_is_404(client, sign_in):
    sign_in("TA")

    response = client.patch("/api/tickets/999", json={"status": "Closed"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket 999 was not found."}


def test_a_student_cannot_update_a_ticket(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, status="Open")
    sign_in("Student")

    response = client.patch(f"/api/tickets/{ticket_id}", json={"status": "Closed"})

    assert response.status_code == 403
    with session_factory() as db:
        assert db.get(Ticket, ticket_id).status == "Open"


def test_the_update_refuses_a_student_even_if_a_caller_forgets_the_route_check(session_factory):
    ticket_id = add_ticket(session_factory, status="Open")

    with session_factory() as db, pytest.raises(HTTPException) as denied:
        update_ticket(db, ticket_id, TicketUpdate(status="Closed"), someone(UserRole.STUDENT))

    assert denied.value.status_code == 403
    with session_factory() as db:
        assert db.get(Ticket, ticket_id).status == "Open"


def test_the_database_rejects_a_status_that_does_not_exist(session_factory):
    with pytest.raises(IntegrityError):
        add_ticket(session_factory, status="open")  # wrong case


def test_the_values_the_database_allows_are_the_values_the_api_accepts():
    assert set(PRIORITY_VALUES) == set(TicketCreate.model_fields["priority"].annotation.__args__)
    assert set(STATUS_VALUES) == set(TicketCreate.model_fields["status"].annotation.__args__)


def test_the_tickets_table_is_valid_postgresql():
    ddl = str(CreateTable(Ticket.__table__).compile(dialect=postgresql.dialect()))

    assert "CONSTRAINT ck_tickets_status CHECK (status IN ('Open', 'In-Progress', 'Closed'))" in ddl
    assert "CONSTRAINT ck_tickets_priority CHECK (priority IN ('Low', 'Medium', 'High'))" in ddl
    assert "due_at TIMESTAMP WITH TIME ZONE NOT NULL" in ddl
