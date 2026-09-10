from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config import settings

_connect_args = {}
if settings.sqlalchemy_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(settings.sqlalchemy_url, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from src import models  # Create tables

    Base.metadata.create_all(bind=engine)
