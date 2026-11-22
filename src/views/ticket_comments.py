"""Ticket comments endpoints."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission
from src.controllers.auth import AuthenticatedUser
from src.controllers.ticket_comments import (
    TicketCommentValidationError,
    create_comment,
    delete_comment,
    list_comments,
    update_comment,
    validate_comment_create,
    validate_comment_update,
)
from src.controllers.validation import read_json_payload
from src.database import get_db
from src.models.ticket_comment import TicketCommentRead

router = APIRouter(prefix="/api", tags=["tickets"])


def _invalid(error: TicketCommentValidationError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error.to_response())


@router.get(
    "/tickets/{ticket_id}/comments",
    response_model=list[TicketCommentRead],
    summary="List comments on a ticket (TA, Lecturer, Admin only)",
    responses={
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
        404: {"description": "No ticket with this id"},
    },
)
def read_ticket_comments(
    ticket_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.VIEW_TICKETS))],
    db: Annotated[Session, Depends(get_db)],
):
    # Verify ticket exists
    from src.controllers.tickets import get_ticket
    ticket = get_ticket(db, ticket_id)
    if ticket is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": f"Ticket {ticket_id} was not found."},
        )
    comments = list_comments(db, ticket_id)
    # Build response with author info
    from src.models.user import User
    result = []
    for c in comments:
        author = db.get(User, c.author_id)
        author_name = author.name if author else "Unknown"
        author_role = author.role if author else "Unknown"
        result.append(TicketCommentRead(
            id=c.id,
            ticket_id=c.ticket_id,
            author_id=c.author_id,
            author_name=author_name,
            author_role=author_role,
            body=c.body,
            created_at=c.created_at,
        ))
    return result


@router.post(
    "/tickets/{ticket_id}/comments",
    response_model=TicketCommentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment to a ticket (TA, Lecturer, Admin only)",
    responses={
        400: {"description": "REQUIRED_FIELDS_MISSING or COMMENT_TOO_LONG"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
        404: {"description": "No ticket with this id"},
        422: {"description": "INVALID_FIELD_FORMAT"},
    },
)
def post_ticket_comment(
    ticket_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.CREATE_TICKET))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = validate_comment_create(raw_payload)
    except TicketCommentValidationError as error:
        return _invalid(error)
    try:
        comment = create_comment(db, ticket_id, payload, user)
    except TicketCommentValidationError as error:
        return _invalid(error)

    # Build response with author info
    from src.models.user import User
    author = db.get(User, comment.author_id)
    author_name = author.name if author else user.name
    author_role = author.role if author else user.role.value
    return TicketCommentRead(
        id=comment.id,
        ticket_id=comment.ticket_id,
        author_id=comment.author_id,
        author_name=author_name,
        author_role=author_role,
        body=comment.body,
        created_at=comment.created_at,
    )


@router.patch(
    "/tickets/{ticket_id}/comments/{comment_id}",
    response_model=TicketCommentRead,
    summary="Update a comment on a ticket (TA, Lecturer, Admin only; author or Admin only)",
    responses={
        400: {"description": "REQUIRED_FIELDS_MISSING or COMMENT_TOO_LONG"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student or not the author"},
        404: {"description": "No ticket or comment with this id"},
        422: {"description": "INVALID_FIELD_FORMAT"},
    },
)
def patch_ticket_comment(
    ticket_id: int,
    comment_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.UPDATE_TICKET))],
    raw_payload: Annotated[Any, Depends(read_json_payload)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = validate_comment_update(raw_payload)
    except TicketCommentValidationError as error:
        return _invalid(error)
    try:
        comment = update_comment(db, ticket_id, comment_id, payload, user)
    except TicketCommentValidationError as error:
        return _invalid(error)

    # Build response with author info
    from src.models.user import User
    author = db.get(User, comment.author_id)
    author_name = author.name if author else user.name
    author_role = author.role if author else user.role.value
    return TicketCommentRead(
        id=comment.id,
        ticket_id=comment.ticket_id,
        author_id=comment.author_id,
        author_name=author_name,
        author_role=author_role,
        body=comment.body,
        created_at=comment.created_at,
    )


@router.delete(
    "/tickets/{ticket_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a comment on a ticket (TA, Lecturer, Admin only; author or Admin only)",
    responses={
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student or not the author"},
        404: {"description": "No ticket or comment with this id"},
    },
)
def delete_ticket_comment(
    ticket_id: int,
    comment_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.UPDATE_TICKET))],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        delete_comment(db, ticket_id, comment_id, user)
    except TicketCommentValidationError as error:
        return _invalid(error)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)