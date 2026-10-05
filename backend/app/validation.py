"""Lectura y validación de la petición con Pydantic.

Convierte los errores de Pydantic al formato de errores de la API, con mensajes
en español que el frontend puede mostrar directamente junto a cada campo.
"""

from typing import Any

from flask import request
from pydantic import BaseModel, ValidationError
from pydantic_core import ErrorDetails

from app.errors import APIError
from app.models import Status

_STATUS_OPTIONS = ", ".join(status.value for status in Status)

# Traducción de los errores más comunes de Pydantic. Los valores entre llaves se
# toman del contexto del error (por ejemplo, el máximo de caracteres).
_MESSAGES: dict[str, str] = {
    "missing": "Este campo es obligatorio.",
    "string_too_long": "Debe tener como máximo {max_length} caracteres.",
    "string_type": "Debe ser texto.",
    "enum": f"Valor no válido. Opciones: {_STATUS_OPTIONS}.",
    "literal_error": "Valor no válido. Opciones: {expected}.",
    "date_type": "Debe ser una fecha con formato AAAA-MM-DD.",
    "date_parsing": "Debe ser una fecha con formato AAAA-MM-DD.",
    "date_from_datetime_parsing": "Debe ser una fecha con formato AAAA-MM-DD.",
    "date_from_datetime_inexact": "Debe ser una fecha con formato AAAA-MM-DD.",
    "int_type": "Debe ser un número entero.",
    "int_parsing": "Debe ser un número entero.",
    "greater_than_equal": "Debe ser mayor o igual a {ge}.",
    "less_than_equal": "Debe ser menor o igual a {le}.",
    "extra_forbidden": "Este campo no está permitido.",
    "model_type": "Se esperaba un objeto JSON.",
    "model_attributes_type": "Se esperaba un objeto JSON.",
}


def _translate(error: ErrorDetails) -> str:
    error_type = error["type"]
    ctx: dict[str, Any] = dict(error.get("ctx") or {})

    if error_type.endswith("_type") and error.get("input") is None:
        return "Este campo es obligatorio."
    if error_type == "string_too_short":
        return "No puede estar vacío." if ctx.get("min_length") == 1 else error["msg"]
    if error_type == "literal_error":
        ctx["expected"] = str(ctx.get("expected", "")).replace("'", "").replace(" or ", ", ")

    template = _MESSAGES.get(error_type)
    if template is None:
        # Errores propios (PydanticCustomError) ya traen su mensaje en español.
        return error["msg"]
    return template.format(**ctx)


def format_validation_errors(exc: ValidationError) -> dict[str, list[str]]:
    """Agrupa los errores por campo: {"company": ["Este campo es obligatorio."]}."""
    details: dict[str, list[str]] = {}
    for error in exc.errors():
        field = ".".join(str(part) for part in error["loc"]) or "body"
        details.setdefault(field, []).append(_translate(error))
    return details


def parse_json_body[ModelT: BaseModel](
    model: type[ModelT], context: dict[str, Any] | None = None
) -> ModelT:
    """Valida el cuerpo JSON de la petición contra un esquema de Pydantic."""
    if not request.is_json:
        raise APIError(
            415,
            "unsupported_media_type",
            "El cuerpo debe enviarse como JSON (Content-Type: application/json).",
        )
    try:
        return model.model_validate_json(request.get_data(), context=context)
    except ValidationError as exc:
        if any(error["type"] == "json_invalid" for error in exc.errors()):
            raise APIError(400, "bad_request", "El cuerpo no es JSON válido.") from None
        raise APIError(
            422,
            "validation_error",
            "Algunos campos no son válidos.",
            details=format_validation_errors(exc),
        ) from None


def parse_query[ModelT: BaseModel](model: type[ModelT]) -> ModelT:
    """Valida los parámetros de la URL (?status=...&page=...)."""
    try:
        return model.model_validate(request.args.to_dict())
    except ValidationError as exc:
        raise APIError(
            422,
            "validation_error",
            "Algunos parámetros de la consulta no son válidos.",
            details=format_validation_errors(exc),
        ) from None
