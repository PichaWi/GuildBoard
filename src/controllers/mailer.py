"""Reminder emails through Gmail (SMTP).

Email is optional: without SMTP_USERNAME/SMTP_PASSWORD in .env the reminder is
still saved, and the response says the email was not sent and why.
"""
import logging
import smtplib
from datetime import datetime
from email.message import EmailMessage

from src.config import settings
from src.controllers.consultations import COURSE_TIMEZONE
from src.models.ticket import Ticket, as_utc

log = logging.getLogger(__name__)

EMAIL_SENT = "sent"
EMAIL_NO_ADDRESS = "no_email"          # the ticket has no owner email
EMAIL_NOT_CONFIGURED = "not_configured"  # no Gmail settings in .env
EMAIL_FAILED = "failed"                # Gmail refused or could not be reached


class Mailer:
    def send(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError


class SmtpMailer(Mailer):
    def __init__(self, host: str, port: int, username: str, password: str, sender: str) -> None:
        self.host, self.port = host, port
        self.username, self.password, self.sender = username, password, sender

    def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(self.host, self.port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(self.username, self.password)
            smtp.send_message(message)


def get_mailer() -> Mailer | None:
    """FastAPI dependency: the Gmail sender, or None when email is switched off."""
    if not (settings.smtp_username and settings.smtp_password):
        return None
    return SmtpMailer(
        settings.smtp_host,
        settings.smtp_port,
        settings.smtp_username,
        settings.smtp_password,
        settings.mail_from or settings.smtp_username,
    )


def build_reminder_email(ticket: Ticket, kind: str, sent_by: str, now: datetime) -> tuple[str, str]:
    due_at = as_utc(ticket.due_at)
    when = "is overdue" if due_at <= now else "is due soon"
    if kind == "flag":
        subject = f"[GuildBoard] TA follow-up requested: {ticket.title}"
        opening = f"{sent_by} flagged this ticket for a TA follow-up:"
    else:
        subject = f"[GuildBoard] Reminder: {ticket.title} {when}"
        opening = f"{sent_by} sent you a reminder about this ticket, which {when}:"
    due_local = due_at.astimezone(COURSE_TIMEZONE).strftime("%d %b %Y, %H:%M")
    body = (
        f"Hello {ticket.owner},\n\n"
        f"{opening}\n\n"
        f"  {ticket.title}\n"
        f"  Due: {due_local} (Bangkok time)\n"
        f"  Status: {ticket.status} | Priority: {ticket.priority}\n\n"
        f"Open the ticket: {settings.frontend_url(f'/tasks/{ticket.id}')}\n\n"
        "This is an automatic message from GuildBoard.\n"
    )
    return subject, body


def send_reminder_email(mailer: Mailer | None, ticket: Ticket, kind: str, sent_by: str, now: datetime) -> str:
    """Send the reminder email if possible; return what happened (EMAIL_* above)."""
    if not ticket.owner_email:
        return EMAIL_NO_ADDRESS
    if mailer is None:
        return EMAIL_NOT_CONFIGURED
    subject, body = build_reminder_email(ticket, kind, sent_by, now)
    try:
        mailer.send(ticket.owner_email, subject, body)
    except (smtplib.SMTPException, OSError):
        log.exception("Reminder email for ticket %s could not be sent", ticket.id)
        return EMAIL_FAILED
    return EMAIL_SENT