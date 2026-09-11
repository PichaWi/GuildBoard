"""Ticket 3 — POST /api/events required-field check (SRS-4, SRS-5)."""
import pytest
from sqlalchemy import func, select

from src.models.event import Event

# The payload create_event.html sends.
VALID_EVENT = {
    "title": "Milestone 2: Architecture Submission",
    "course_code": "ISP",
    "event_type": "Project Milestone",
    "event_date": "2026-10-20",
    "start_time": "10:00",
    "end_time": "12:00",
    "location": "Room 402, Engineering Hall",
    "instructor": "Aj. Hutchathai",
    "description": "",
    "publish_immediately": True,
    "notify_email": False,
}


@pytest.fixture
def lecturer(client, login_as):
    login_as("Lecturer")
    return client


@pytest.fixture
def event_count(session_factory):
    def _count() -> int:
        with session_factory() as db:
            return db.scalar(select(func.count()).select_from(Event))

    return _count


def without(*fields: str) -> dict:
    return {key: value for key, value in VALID_EVENT.items() if key not in fields}


# --- Missing required fields ----------------------------------------------------

def test_a_missing_title_is_rejected(lecturer):
    response = lecturer.post("/api/events", json=without("title"))

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Missing required field(s): Event Title.",
        "error": "REQUIRED_FIELDS_MISSING",
        "missing_fields": ["title"],
    }


def test_a_missing_date_is_rejected(lecturer):
    response = lecturer.post("/api/events", json=without("event_date"))

    assert response.status_code == 400
    assert response.json()["error"] == "REQUIRED_FIELDS_MISSING"
    assert response.json()["missing_fields"] == ["event_date"]
    assert "Event Date" in response.json()["detail"]


def test_title_and_date_are_reported_together(lecturer):
    response = lecturer.post("/api/events", json=without("title", "event_date"))

    assert response.json()["missing_fields"] == ["title", "event_date"]
    assert response.json()["detail"] == "Missing required field(s): Event Title, Event Date."


def test_a_whitespace_only_title_counts_as_missing(lecturer):
    response = lecturer.post("/api/events", json={**VALID_EVENT, "title": "   "})

    assert response.status_code == 400
    assert response.json()["missing_fields"] == ["title"]


def test_a_null_date_counts_as_missing(lecturer):
    response = lecturer.post("/api/events", json={**VALID_EVENT, "event_date": None})

    assert response.json()["missing_fields"] == ["event_date"]


def test_an_empty_body_lists_every_required_field_in_form_order(lecturer):
    response = lecturer.post("/api/events", json={})

    assert response.status_code == 400
    assert response.json()["missing_fields"] == [
        "title",
        "course_code",
        "event_type",
        "event_date",
        "start_time",
        "end_time",
    ]


def test_malformed_json_is_treated_as_an_empty_body(lecturer):
    response = lecturer.post(
        "/api/events", content=b"{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 400
    assert response.json()["error"] == "REQUIRED_FIELDS_MISSING"


def test_a_rejected_event_is_never_saved(lecturer, event_count):
    lecturer.post("/api/events", json=without("title", "event_date"))

    # SRS-5: nothing is written when required data is missing.
    assert event_count() == 0


def test_the_error_detail_is_a_string_the_publish_toast_can_show(lecturer):
    # create_event.html shows `result.detail` in its toast.
    detail = lecturer.post("/api/events", json=without("title")).json()["detail"]

    assert isinstance(detail, str)


# --- Invalid formats ------------------------------------------------------------

def test_a_malformed_date_is_rejected_without_saving(lecturer, event_count):
    response = lecturer.post("/api/events", json={**VALID_EVENT, "event_date": "20-10-2026"})

    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_FIELD_FORMAT"
    assert isinstance(response.json()["detail"], str)
    assert event_count() == 0


def test_an_end_time_before_the_start_is_rejected(lecturer):
    response = lecturer.post(
        "/api/events", json={**VALID_EVENT, "start_time": "12:00", "end_time": "10:00"}
    )

    assert response.status_code == 422
    assert "end_time must be later than start_time" in response.json()["detail"]


# --- Order of checks ------------------------------------------------------------

def test_sign_in_is_checked_before_the_payload(client):
    assert client.post("/api/events", json={}).status_code == 401


def test_role_is_checked_before_the_payload(client, login_as):
    login_as("Student")

    response = client.post("/api/events", json={})

    assert response.status_code == 403
    assert response.json() == {"detail": "Students are not permitted to create events."}


# --- Successful creation ----------------------------------------------------------

def test_a_complete_event_is_created(lecturer, event_count):
    response = lecturer.post("/api/events", json=VALID_EVENT)

    assert response.status_code == 201
    assert response.json()["title"] == VALID_EVENT["title"]
    assert event_count() == 1


def test_surrounding_whitespace_is_trimmed_before_saving(lecturer):
    response = lecturer.post("/api/events", json={**VALID_EVENT, "title": "  Lab Check  "})

    assert response.json()["title"] == "Lab Check"


def test_a_role_in_the_body_cannot_override_the_session_role(lecturer):
    response = lecturer.post("/api/events", json={**VALID_EVENT, "created_by_role": "Admin"})

    assert response.json()["created_by_role"] == "Lecturer"


def test_a_form_encoded_post_is_accepted(lecturer):
    response = lecturer.post("/api/events", data={**VALID_EVENT, "publish_immediately": "true", "notify_email": "false"})

    assert response.status_code == 201
