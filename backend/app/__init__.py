"""API de Job Tracker.

``create_app`` es una *application factory*: en lugar de una app global, cada
llamada crea una app nueva con la configuración indicada. Así las pruebas pueden
crear una app apuntando a la base de datos de pruebas.
"""

from flask import Flask

from app import models  # noqa: F401  Registra los modelos para SQLAlchemy y las migraciones.
from app.api import api_v1
from app.cli import register_cli
from app.config import get_config
from app.errors import register_error_handlers
from app.extensions import MIGRATIONS_DIR, db, migrate


def create_app(env: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(get_config(env))
    app.json.sort_keys = False  # Respeta el orden de los campos en las respuestas.
    app.json.ensure_ascii = False  # Envía "próxima" tal cual, en vez de "próxima".

    db.init_app(app)
    # render_as_batch=False: el modo "batch" solo hace falta con SQLite.
    migrate.init_app(app, db, directory=str(MIGRATIONS_DIR), render_as_batch=False)

    app.register_blueprint(api_v1)
    register_error_handlers(app)
    register_cli(app)
    return app
