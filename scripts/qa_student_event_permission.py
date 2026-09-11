#!/usr/bin/env python3
"""Verify that a Student cannot create an event through the HTTP API."""

import argparse
import http.cookiejar
import json
import os
import sys
from datetime import UTC, datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import HTTPCookieProcessor, Request, build_opener


EVENT_PAYLOAD = {
    "title": "QA: Student must not create this event",
    "course_code": "ISP",
    "event_type": "Project Milestone",
    "event_date": "2026-10-20",
    "start_time": "10:00",
    "end_time": "12:00",
    "location": "QA Test Room",
    "instructor": "QA Student Account",
    "description": "Direct API authorization test for the QA slide.",
    "publish_immediately": True,
    "notify_email": False,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8000/api/events",
        help="Event creation endpoint (default: %(default)s)",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("QA_STUDENT_EMAIL"),
        help="Student dev account email (or set QA_STUDENT_EMAIL)",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("QA_STUDENT_PASSWORD"),
        help="Student dev account password (or set QA_STUDENT_PASSWORD)",
    )
    args = parser.parse_args()
    if not args.email or not args.password:
        parser.error("Student credentials are required via arguments or QA_STUDENT_* env vars")
    return args


def main() -> int:
    args = parse_args()
    cookie_jar = http.cookiejar.CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookie_jar))
    login_url = urljoin(args.url, "/api/auth/dev-login")
    login_request = Request(
        login_url,
        data=json.dumps({"email": args.email, "password": args.password}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with opener.open(login_request, timeout=10) as response:
            login_status = response.status
    except HTTPError as error:
        print(
            f"Student login failed ({error.code}): {error.read().decode('utf-8')}",
            file=sys.stderr,
        )
        return 2
    except URLError as error:
        print(f"QA login request failed: {error.reason}", file=sys.stderr)
        return 2

    request = Request(
        args.url,
        data=json.dumps(EVENT_PAYLOAD).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            # Prove that a Student session cannot escalate via a caller-controlled header.
            "X-User-Role": "Lecturer",
        },
        method="POST",
    )

    status = 0
    body = ""
    try:
        with opener.open(request, timeout=10) as response:
            status = response.status
            body = response.read().decode("utf-8")
    except HTTPError as error:
        status = error.code
        body = error.read().decode("utf-8")
    except URLError as error:
        print(f"QA request failed: {error.reason}", file=sys.stderr)
        return 2

    expected_detail = "Students are not permitted to create events."
    try:
        response_detail = json.loads(body).get("detail")
    except (json.JSONDecodeError, AttributeError):
        response_detail = None
    passed = login_status == 200 and status == 403 and response_detail == expected_detail
    print("# GuildBoard Student Event API Authorization Test")
    print()
    print(f"- Tested at (UTC): {datetime.now(UTC).isoformat()}")
    print(f"- Request: `POST {args.url}`")
    print(f"- Student login status: `{login_status}`")
    print("- Authenticated session role: `Student`")
    print("- Spoofed request header: `X-User-Role: Lecturer` (must be ignored)")
    print(f"- Expected status: `403 Forbidden`")
    print(f"- Actual status: `{status}`")
    print(f"- Response body: `{body}`")
    print(f"- Result: **{'PASS' if passed else 'FAIL'}**")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
