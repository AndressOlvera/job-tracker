"""Versión 1 de la API. Todas las rutas quedan bajo /api/v1."""

from flask import Blueprint

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")

# Se importan al final porque estos módulos usan `api_v1` para registrar sus rutas.
from app.api import applications, health, stats  # noqa: E402, F401
