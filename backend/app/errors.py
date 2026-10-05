"""Errores de la API y su formato JSON común.

Todas las respuestas de error tienen la forma descrita en docs/03-api.md:

    {"error": {"code": "...", "message": "...", "details": {...}}}
"""

from typing import Any

from flask import Flask, Response, jsonify
from werkzeug.exceptions import HTTPException, MethodNotAllowed


class APIError(Exception):
    """Error controlado que se convierte en una respuesta JSON."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def error_response(
    status: int, code: str, message: str, details: dict[str, Any] | None = None
) -> tuple[Response, int]:
    error: dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    return jsonify({"error": error}), status


# Errores HTTP que genera Flask por su cuenta (ruta inexistente, método incorrecto...).
HTTP_ERRORS: dict[int, tuple[str, str]] = {
    400: ("bad_request", "La petición no es válida."),
    404: ("not_found", "El recurso solicitado no existe."),
    405: ("method_not_allowed", "Método no permitido en esta ruta."),
    415: ("unsupported_media_type", "Tipo de contenido no soportado."),
}


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(APIError)
    def handle_api_error(exc: APIError):
        return error_response(exc.status, exc.code, exc.message, exc.details)

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):
        status = exc.code or 500
        code, message = HTTP_ERRORS.get(status, ("http_error", exc.name))
        response, status = error_response(status, code, message)
        if isinstance(exc, MethodNotAllowed) and exc.valid_methods:
            # El estándar HTTP pide indicar qué métodos sí se permiten.
            response.headers["Allow"] = ", ".join(sorted(exc.valid_methods))
        return response, status

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        # Se registra el detalle en los logs, pero nunca se envía al cliente.
        app.logger.exception("Error no controlado: %s", exc)
        return error_response(500, "internal_error", "Ocurrió un error inesperado.")
