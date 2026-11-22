# Models Layer (SQLAlchemy / Pydantic)
from src.models.consultation import ConsultationCreate, ConsultationRead, ConsultationSession
from src.models.event import Event, EventCreate, EventRead
from src.models.reminder import REMINDER_KINDS, TicketReminder
from src.models.material import CourseMaterial, MaterialCreate, MaterialRead
from src.models.ticket import Ticket, TicketCreate, TicketRead, TicketUpdate
from src.models.ticket_comment import TicketComment, TicketCommentCreate, TicketCommentRead
from src.models.user import User

__all__ = [
    "ConsultationCreate",
    "ConsultationRead",
    "ConsultationSession",
    "CourseMaterial",
    "Event",
    "EventCreate",
    "EventRead",
    "MaterialCreate",
    "MaterialRead",
    "Ticket",
    "TicketReminder",
    "REMINDER_KINDS",
    "TicketCreate",
    "TicketRead",
    "TicketUpdate",
    "TicketComment",
    "TicketCommentCreate",
    "TicketCommentRead",
    "User",
]
