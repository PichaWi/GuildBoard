#!/usr/bin/env python3
"""Repeatable Docker QA using real HTTP, sessions, and PostgreSQL data.

This real-session flow covers Student and Lecturer only. The baseline pytest
suite covers Student, Lecturer, TA, and Admin through its fake Google login.
"""

import json
import os
from datetime import UTC, datetime, timedelta
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener


BASE_URL = "http://frontend"
STUDENT = (os.environ["DEMO_STUDENT_EMAIL"], os.environ["DEMO_STUDENT_PASSWORD"])
LECTURER = (os.environ["DEMO_LECTURER_EMAIL"], os.environ["DEMO_LECTURER_PASSWORD"])
opener = build_opener(HTTPCookieProcessor(CookieJar()))


def request(method, path, payload=None, expected=200):
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request(
        BASE_URL + path,
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )
    try:
        with opener.open(req, timeout=10) as response:
            status, raw = response.status, response.read()
    except HTTPError as error:
        status, raw = error.code, error.read()
    assert status == expected, f"{method} {path}: expected {expected}, got {status}: {raw!r}"
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def login(credentials, role):
    email, password = credentials
    user = request("POST", "/api/auth/dev-login", {"email": email, "password": password})
    assert user["role"] == role and user["auth_mode"] == "signed-dev-session-not-for-production"
    me = request("GET", "/api/auth/me")
    assert me["id"] == user["id"] and me["role"] == role
    print(f"PASS: real {role} session login and /api/auth/me")


def logout():
    request("POST", "/auth/logout")
    request("GET", "/api/auth/me", expected=401)
    print("PASS: /auth/logout clears the session; /api/auth/me returns 401")


def main():
    login(LECTURER, "Lecturer")

    event_payload = {
        "title": "Iteration 5 real-data QA event",
        "course_code": "ISP",
        "event_type": "Project Milestone",
        "event_date": (datetime.now(UTC) + timedelta(days=7)).date().isoformat(),
        "start_time": "10:00",
        "end_time": "11:00",
        "location": "Docker QA Room",
        "instructor": "Demo Lecturer",
        "description": "Created by the repeatable Iteration 5 Docker QA.",
        "publish_immediately": True,
        "notify_email": False,
    }
    event = request("POST", "/api/events", event_payload, 201)
    feed = request("GET", "/api/events")
    assert event["id"] in {item["id"] for item in feed["events"]}
    reread_event = request("GET", f"/api/events/{event['id']}")
    assert reread_event["title"] == event_payload["title"]
    print("PASS: Lecturer creates a published event; feed and separate ID reads persist it")

    now = datetime.now(UTC)
    ticket_cases = [
        ("due-47h", timedelta(hours=47), "Open"),
        ("due-49h", timedelta(hours=49), "Open"),
        ("overdue", timedelta(hours=-2), "Open"),
        ("closed-overdue", timedelta(hours=-3), "Closed"),
    ]
    tickets = {}
    for label, offset, status in ticket_cases:
        tickets[label] = request(
            "POST",
            "/api/tickets",
            {
                "title": f"Iteration 5 QA {label}",
                "description": "Real-data Docker QA ticket.",
                "owner": "Demo Lecturer",
                "owner_role": "Lecturer",
                "priority": "Medium",
                "status": status,
                "due_at": (now + offset).isoformat(),
            },
            201,
        )

    listed = request("GET", "/api/tickets")
    created_ids = {ticket["id"] for ticket in tickets.values()}
    assert created_ids <= {ticket["id"] for ticket in listed}
    closed = request("GET", "/api/tickets?status=Closed")
    assert tickets["closed-overdue"]["id"] in {ticket["id"] for ticket in closed}
    assert all(ticket["status"] == "Closed" for ticket in closed)
    changed = request(
        "PATCH", f"/api/tickets/{tickets['due-49h']['id']}", {"status": "In-Progress"}
    )
    assert changed["status"] == "In-Progress"
    reread_tickets = request("GET", "/api/tickets")
    reread = {ticket["id"]: ticket for ticket in reread_tickets}
    assert reread[changed["id"]]["status"] == "In-Progress"
    print("PASS: ticket create, list, filter, PATCH, and separate reread use persisted data")

    report = request("GET", "/api/at-risk")
    risk_ids = {item["id"] for item in report["items"]}
    eligible = {tickets["due-47h"]["id"], tickets["overdue"]["id"]}
    excluded = {tickets["due-49h"]["id"], tickets["closed-overdue"]["id"]}
    assert risk_ids & created_ids == eligible and risk_ids.isdisjoint(excluded)
    risks = {item["id"]: item["risk_type"] for item in report["items"]}
    assert risks[tickets["due-47h"]["id"]] == "nearing"
    assert risks[tickets["overdue"]["id"]] == "overdue"
    print("PASS: at-risk includes 47h/overdue IDs and excludes 49h/closed IDs")

    due_47_id = tickets["due-47h"]["id"]
    closed_eligible = request("PATCH", f"/api/tickets/{due_47_id}", {"status": "Closed"})
    assert closed_eligible["status"] == "Closed"
    report_after_close = request("GET", "/api/at-risk")
    risk_ids_after_close = {item["id"] for item in report_after_close["items"]}
    assert due_47_id not in risk_ids_after_close
    assert tickets["overdue"]["id"] in risk_ids_after_close
    print("PASS: closing an eligible ticket removes its ID from the next at-risk report")
    logout()

    login(STUDENT, "Student")
    student_feed = request("GET", "/api/events")
    assert event["id"] in {item["id"] for item in student_feed["events"]}
    request("POST", "/api/events", event_payload, 403)
    request("GET", "/api/tickets", expected=403)
    request("POST", "/api/tickets", {}, 403)
    request("GET", "/api/at-risk", expected=403)
    print("PASS: Student sees published calendar data and receives 403 for staff operations")
    logout()
    print("PASS: Iteration 5 real-data QA completed")


if __name__ == "__main__":
    main()
