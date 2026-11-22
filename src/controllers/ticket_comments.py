"""Ticket comments controller."""
from typing import Any

from fastapi import status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission, get_current_user_db_id
from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.validation import (
    APIValidationError,
    _clean,
    validate_model,
)
from src.models.ticket import Ticket
from src.models.ticket_comment import TicketComment, TicketCommentCreate, TicketCommentUpdate


ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"
ERROR_COMMENT_TOO_LONG = "COMMENT_TOO_LONG"
ERROR_COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND"


class TicketCommentValidationError(APIValidationError):
    pass


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
    return validate_model(TicketCommentCreate, cleaned, ERROR_INVALID_FIELD_FORMAT)


def validate_comment_update(raw: Any) -> TicketCommentUpdate:
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
    return validate_model(TicketCommentUpdate, cleaned, ERROR_INVALID_FIELD_FORMAT)


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

    author_id = get_current_user_db_id(db, user)
    author_name = user.name
    author_role = user.role.value

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


def update_comment(db: Session, ticket_id: int, comment_id: int, payload: TicketCommentUpdate, user: AuthenticatedUser) -> TicketComment:
    ensure_permission(user, Action.UPDATE_TICKET)

    # Verify ticket exists
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise TicketCommentValidationError(
            "TICKET_NOT_FOUND",
            f"Ticket {ticket_id} not found.",
            status.HTTP_404_NOT_FOUND,
        )

    comment = db.get(TicketComment, comment_id)
    if comment is None or comment.ticket_id != ticket_id:
        raise TicketCommentValidationError(
            ERROR_COMMENT_NOT_FOUND,
            f"Comment {comment_id} not found on ticket {ticket_id}.",
            status.HTTP_404_NOT_FOUND,
        )

    # Only author can edit their own comment (Admins can edit any)
    current_user_db_id = get_current_user_db_id(db, user)
    if current_user_db_id is None or (comment.author_id != current_user_db_id and user.role != UserRole.ADMIN):
        raise TicketCommentValidationError(
            "FORBIDDEN",
            "You can only edit your own comments.",
            status.HTTP_403_FORBIDDEN,
        )

    comment.body = payload.body
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, ticket_id: int, comment_id: int, user: AuthenticatedUser) -> None:
    ensure_permission(user, Action.UPDATE_TICKET)

    # Verify ticket exists
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise TicketCommentValidationError(
            "TICKET_NOT_FOUND",
            f"Ticket {ticket_id} not found.",
            status.HTTP_404_NOT_FOUND,
        )

    comment = db.get(TicketComment, comment_id)
    if comment is None or comment.ticket_id != ticket_id:
        raise TicketCommentValidationError(
            ERROR_COMMENT_NOT_FOUND,
            f"Comment {comment_id} not found on ticket {ticket_id}.",
            status.HTTP_404_NOT_FOUND,
        )

    # Only author can delete their own comment (Admins can delete any)
    current_user_db_id = get_current_user_db_id(db, user)
    if current_user_db_id is None or (comment.author_id != current_user_db_id and user.role != UserRole.ADMIN):
        raise TicketCommentValidationError(
            "FORBIDDEN",
            "You can only delete your own comments.",
            status.HTTP_403_FORBIDDEN,
        )

    db.delete(comment)
    db.commit()