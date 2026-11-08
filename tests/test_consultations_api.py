from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.consultations import record_consultation
from src.models.consultation import ConsultationCreate, ConsultationSession
from src.models.user import User

VALID_SESSION = {
    "student_name": "Sarah Jenkins",
    "student_id": "64010892",
    "course_code": "ISP",
    "topic": "Architecture review",
    "session_at": "2026-11-05T14:30:00+07:00",
    "notes": "Went through the deployment diagram.",
}


@pytest.fixture
def sign_in(client, google, session_factory):
    def _sign_in(role: str) -> str:
        email = f"{role.lower()}@ku.th"
        with session_factory() as db:
            db.add(User(email=email, name=role, role=role))
            db.commit()
        google({"email": email, "email_verified": True, "name": role})
        assert client.get("/auth/callback", follow_redirects=False).status_code == 303
        return email

    return _sign_in


def session_count(session_factory) -> int:
    with session_factory() as db:
        return db.scalar(select(func.count()).select_from(ConsultationSession))


def add_session(session_factory, **overrides) -> int:
    values = {
        "student_name": "Sarah Jenkins",
        "student_id": "64010892",
        "course_code": "ISP",
        "topic": "Architecture review",
        "session_at": datetime(2026, 11, 5, 7, 30, tzinfo=timezone.utc),
        "notes": "",
        "recorded_by": "ta@ku.th",
        **overrides,
    }
    with session_factory() as db:
        session = ConsultationSession(**values)
        db.add(session)
        db.commit()
        return session.id


def ids(response) -> list[int]:
    assert response.status_code == 200, response.text
    return [session["id"] for session in response.json()]


def test_a_ta_can_record_a_session(client, sign_in, session_factory):
    email = sign_in("TA")

    response = client.post("/api/consultations", json=VALID_SESSION)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["student_name"] == "Sarah Jenkins"
    assert body["topic"] == "Architecture review"
    assert body["notes"] == "Went through the deployment diagram."
    assert body["recorded_by"] == email
    assert datetime.fromisoformat(body["session_at"]) == datetime(2026, 11, 5, 7, 30, tzinfo=timezone.utc)
    assert session_count(session_factory) == 1


def test_student_id_course_and_notes_are_optional(client, sign_in):
    sign_in("TA")
    minimal = {"student_name": "Sarah", "topic": "MVC", "session_at": "2026-11-05T09:00:00Z"}

    body = client.post("/api/consultations", json=minimal).json()

    assert (body["student_id"], body["course_code"], body["notes"]) == ("", "", "")


def test_recorded_by_cannot_be_chosen_by_the_caller(client, sign_in):
    email = sign_in("TA")

    body = client.post("/api/consultations", json={**VALID_SESSION, "recorded_by": "other@ku.th"}).json()

    assert body["recorded_by"] == email


@pytest.mark.parametrize("role", ["Student", "Lecturer", "Admin"])
def test_only_a_ta_can_record(client, sign_in, session_factory, role):
    sign_in(role)

    response = client.post("/api/consultations", json=VALID_SESSION)

    assert response.status_code == 403
    assert response.json() == {"detail": "Only TAs can record consultation sessions."}
    assert session_count(session_factory) == 0


def test_nobody_signed_in_cannot_record(client, session_factory):
    assert client.post("/api/consultations", json=VALID_SESSION).status_code == 401
    assert session_count(session_factory) == 0


def test_the_role_is_checked_before_the_body_is_read(client, sign_in):
    sign_in("Student")

    response = client.post(
        "/api/consultations", content=b"{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 403


def test_a_role_in_the_body_or_a_header_is_ignored(client, sign_in, session_factory):
    sign_in("Student")

    response = client.post(
        "/api/consultations", json={**VALID_SESSION, "role": "TA"}, headers={"X-User-Role": "TA"}
    )

    assert response.status_code == 403
    assert session_count(session_factory) == 0


def test_the_database_write_refuses_a_non_ta_even_if_a_caller_forgets_the_route_check(session_factory):
    payload = ConsultationCreate.model_validate(VALID_SESSION)
    student = AuthenticatedUser("someone@ku.th", "Someone", UserRole.STUDENT, "test")

    with session_factory() as db, pytest.raises(HTTPException) as denied:
        record_consultation(db, payload, student)

    assert denied.value.status_code == 403
    assert session_count(session_factory) == 0


def test_missing_required_fields_are_listed(client, sign_in, session_factory):
    sign_in("TA")

    response = client.post("/api/consultations", json={"student_name": "  ", "notes": "x"})

    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "REQUIRED_FIELDS_MISSING"
    assert body["missing_fields"] == ["student_name", "topic", "session_at"]
    assert session_count(session_factory) == 0


@pytest.mark.parametrize(
    "field, value",
    [("session_at", "next Friday"), ("topic", "x" * 256), ("student_name", "x" * 121)],
)
def test_invalid_values_are_rejected(client, sign_in, session_factory, field, value):
    sign_in("TA")

    response = client.post("/api/consultations", json={**VALID_SESSION, field: value})

    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_FIELD_FORMAT"
    assert field in response.json()["detail"]
    assert session_count(session_factory) == 0


def test_sessions_are_listed_newest_first(client, sign_in, session_factory):
    older = add_session(session_factory, session_at=datetime(2026, 11, 1, tzinfo=timezone.utc))
    newer = add_session(session_factory, session_at=datetime(2026, 11, 6, tzinfo=timezone.utc))
    sign_in("TA")

    assert ids(client.get("/api/consultations")) == [newer, older]


@pytest.mark.parametrize(
    "keyword",
    ["architecture", "ARCHITECTURE", "sidecar", "isp"],
)
def test_keyword_search_covers_topic_notes_and_course_ignoring_case(client, sign_in, session_factory, keyword):
    match = add_session(session_factory, topic="Architecture review", notes="Missing sidecar", course_code="ISP")
    add_session(session_factory, topic="Essay structure", notes="LaTeX template", course_code="FM")
    sign_in("TA")

    assert ids(client.get("/api/consultations", params={"q": keyword})) == [match]


@pytest.mark.parametrize("student", ["sarah", "Jenkins", "64010892"])
def test_student_search_covers_name_and_id(client, sign_in, session_factory, student):
    match = add_session(session_factory, student_name="Sarah Jenkins", student_id="64010892")
    add_session(session_factory, student_name="Alexei Kozlov", student_id="64010915")
    sign_in("TA")

    assert ids(client.get("/api/consultations", params={"student": student})) == [match]


def test_date_search_uses_the_day_in_thailand(client, sign_in, session_factory):
    # 00:30 on 5 Nov in Bangkok is still 4 Nov in UTC.
    just_after_midnight = add_session(session_factory, session_at=datetime(2026, 11, 4, 17, 30, tzinfo=timezone.utc))
    last_minute = add_session(session_factory, session_at=datetime(2026, 11, 5, 16, 59, tzinfo=timezone.utc))
    add_session(session_factory, session_at=datetime(2026, 11, 4, 16, 59, tzinfo=timezone.utc))
    add_session(session_factory, session_at=datetime(2026, 11, 5, 17, 0, tzinfo=timezone.utc))
    sign_in("TA")

    assert ids(client.get("/api/consultations", params={"date": "2026-11-05"})) == [last_minute, just_after_midnight]


def test_filters_narrow_each_other(client, sign_in, session_factory):
    match = add_session(session_factory, student_name="Sarah", topic="MVC")
    add_session(session_factory, student_name="Sarah", topic="Docker")
    add_session(session_factory, student_name="Alexei", topic="MVC")
    sign_in("TA")

    assert ids(client.get("/api/consultations", params={"q": "mvc", "student": "sarah"})) == [match]


def test_no_match_returns_an_empty_list(client, sign_in, session_factory):
    add_session(session_factory)
    sign_in("TA")

    response = client.get("/api/consultations", params={"q": "nothing like this"})

    assert response.status_code == 200
    assert response.json() == []


def test_blank_filters_are_ignored(client, sign_in, session_factory):
    session_id = add_session(session_factory)
    sign_in("TA")

    assert ids(client.get("/api/consultations", params={"q": "   ", "student": " "})) == [session_id]


@pytest.mark.parametrize("wildcard", ["%", "_"])
def test_a_wildcard_is_searched_as_plain_text(client, sign_in, session_factory, wildcard):
    add_session(session_factory, topic="Architecture review")
    match = add_session(session_factory, topic=f"Grade{wildcard}weights")
    sign_in("TA")

    assert ids(client.get("/api/consultations", params={"q": wildcard})) == [match]


def test_an_invalid_date_is_rejected(client, sign_in):
    sign_in("TA")

    assert client.get("/api/consultations", params={"date": "next Friday"}).status_code == 422


@pytest.mark.parametrize("role", ["Student", "Lecturer", "Admin"])
def test_only_a_ta_can_search(client, sign_in, session_factory, role):
    add_session(session_factory)
    sign_in(role)

    response = client.get("/api/consultations")

    assert response.status_code == 403
    assert response.json() == {"detail": "Only TAs can search consultation sessions."}


def test_nobody_signed_in_cannot_search(client):
    assert client.get("/api/consultations").status_code == 401
