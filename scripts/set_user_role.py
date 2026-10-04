#!/usr/bin/env python3
"""Give a @ku.th person a role: Student, TA, Lecturer or Admin.

Roles live in the users table, and nothing in the app lets a user change their
own. Until the Admin screen exists, this is how staff are made. It works on the
database in DATABASE_URL (from the environment or .env), and the change applies
on that person's next request, even if they are already signed in.

    python scripts/set_user_role.py lecturer@ku.th Lecturer
"""
import argparse
import sys
from pathlib import Path

# Allow `python scripts/set_user_role.py` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.controllers.auth import UserRole  # noqa: E402
from src.controllers.users import RoleAssignmentError, assign_role  # noqa: E402
from src.database import SessionLocal, init_db  # noqa: E402

ROLES = {role.value.casefold(): role for role in UserRole}


def parse_role(text: str) -> UserRole:
    try:
        return ROLES[text.strip().casefold()]
    except KeyError:
        choices = ", ".join(role.value for role in UserRole)
        raise argparse.ArgumentTypeError(f"unknown role {text!r} (choose from: {choices})") from None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("email", help="a @ku.th address")
    parser.add_argument("role", type=parse_role, help="Student, TA, Lecturer or Admin")
    args = parser.parse_args(argv)

    init_db()
    with SessionLocal() as db:
        try:
            user, created = assign_role(db, args.email, args.role)
        except RoleAssignmentError as error:
            print(f"error: {error}", file=sys.stderr)
            return 1

    action = "Created" if created else "Updated"
    print(f"{action} {user.email} as {user.role}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
