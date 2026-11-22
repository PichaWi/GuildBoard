"""Shared validation utilities for controllers."""
from typing import Any

from fastapi import Request, status
from pydantic import BaseModel, ValidationError


def _clean(raw: Any) -> dict[str, Any]:
    """Strip string values in a dict."""
    data = raw if isinstance(raw, dict) else {}
    return {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


async def read_json_payload(request: Request) -> Any:
    try:
        return await request.json()
    except ValueError:
        return {}


class APIValidationError(Exception):
    """Base validation error with standard response format."""

    def __init__(
        self,
        error: str,
        detail: str,
        status_code: int,
        **extra: Any,
    ) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code
        self.extra = extra

    def to_response(self) -> dict[str, Any]:
        return {"detail": self.detail, "error": self.error, **self.extra}


def validate_model(model: type[BaseModel], data: dict[str, Any], error_code: str, status_code: int = status.HTTP_422_UNPROCESSABLE_ENTITY, error_class: type[APIValidationError] = APIValidationError) -> Any:
    """Validate data against a Pydantic model, raising specified error class on failure."""
    try:
        return model.model_validate(data)
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" for error in exc.errors()
        )
        raise error_class(
            error_code,
            f"Invalid field(s): {problems}.",
            status_code,
        ) from None