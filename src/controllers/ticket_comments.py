"""Ticket comments controller."""
from typing import Any

from fastapi import status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser
from src.models.ticket import Ticket
from src.models.ticket_comment import TicketComment, TicketCommentCreate
from src.models.user import User


ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"
ERROR_COMMENT_TOO_LONG = "COMMENT_TOO_LONG"


class TicketCommentValidationError(Exception):
    def __init__(self, error: str, detail: str, status_code: int, **extra: Any) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code
        self.extra = extra

    def to_response(self) -> dict[str, Any]:
        return {"detail": self.detail, "error": self.error, **self.extra}


def _clean(raw: Any) -> dict[str, Any]:
    data = raw if isinstance(raw, dict) else {}
    return {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}


def validate_comment_create(raw: Any) -> TicketCommentCreate:
    cleaned = _clean(raw)
    if not cleaned.get("body"):
        raise TicketCommentValidationError(
            ERROR_REQUIRED_FIELDS_MISSING,
            "Missing required field(s): body.",
            status.HTTP_400_BAD_REQUEST,
            missing_fields=["body"],
        )
    body = cleaned.get("body", "")
    if len(body) > 2000:
        raise TicketCommentValidationError(
            ERROR_COMMENT_TOO_LONG,
            "Comment body must be 2000 characters or less.",
            status.HTTP_400_BAD_REQUEST,
        )
    try:
        return TicketCommentCreate.model_validate(cleaned)
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" for error in exc.errors()
        )
        raise TicketCommentValidationError(
            ERROR_INVALID_FIELD_FORMAT,
            f"Invalid comment field(s): {problems}.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ) from None


def list_comments(db: Session, ticket_id: int) -> list[TicketComment]:
    return list(db.scalars(
        select(TicketComment)
        .where(TicketComment.ticket_id == ticket_id)
        .order_by(TicketComment.created_at)
    ))


def create_comment(db: Session, ticket_id: int, payload: TicketCommentCreate, user: AuthenticatedUser) -> TicketComment:
    ensure_permission(user, Action.CREATE_TICKET)  # same permission as creating/updating tickets

    # Verify ticket exists
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise TicketCommentValidationError(
            "TICKET_NOT_FOUND",
            f"Ticket {ticket_id} not found.",
            status.HTTP_404_NOT_FOUND,
        )

    # Get author info from user - for dev logins, look up by email (case-insensitive)
    if user.id.isdigit():
        author = db.get(User, user.id)
    elif user.email:
        author = db.scalar(select(User).where(User.email.ilike(user.email)))
    else:
        author = None

    author_name = author.name if author else user.name
    author_role = author.role if author else user.role.value
    author_id = author.id if author else 0  # 0 for dev login users without DB match

    # Debug: if author not found, raise error with details
    if author_id == 0:
        raise TicketCommentValidationError(
            "AUTHOR_NOT_FOUND",
            f"Author not found in database for user {user.id} (email: {user.email})",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=author_id,
        body=payload.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Attach author info for response
    comment.author_name = author_name
    comment.author_role = author_role
    return comment