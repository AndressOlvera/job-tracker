"""Configuración compartida de las pruebas (fixtures de pytest).

Las pruebas usan una base de datos PostgreSQL real y separada (TEST_DATABASE_URL),
porque la app depende de funciones propias de PostgreSQL (ILIKE, to_char,
restricciones CHECK). Antes de correrlas debe estar arriba: `docker compose up -d db`.
"""

from collections.abc import Callable, Iterator
from datetime import date
from typing import Any

import pytest
from dotenv import load_dotenv
from flask import Flask
from flask.testing import FlaskClient
from flask_migrate import upgrade
from sqlalchemy import text

from app import create_app
from app.extensions import db
from app.models import Application

load_dotenv()  # Toma TEST_DATABASE_URL del archivo .env si existe.

# Fecha fija para que las pruebas den el mismo resultado cualquier día.
TODAY = date(2026, 10, 5)


@pytest.fixture(scope="session")
def app() -> Iterator[Flask]:
    """Crea la app una sola vez y deja la base de pruebas con las migraciones aplicadas."""
    app = create_app("testing")
    with app.app_context():
        db.session.execute(text("DROP TABLE IF EXISTS applications, alembic_version"))
        db.session.commit()
        upgrade()  # Crea las tablas con las mismas migraciones que se usan en producción.
    yield app


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch: pytest.MonkeyPatch) -> date:
    monkeypatch.setattr("app.clock.today", lambda: TODAY)
    return TODAY


@pytest.fixture
def clean_db(app: Flask) -> Iterator[None]:
    """Vacía la tabla ANTES de cada prueba, para que ninguna dependa de otra."""
    with app.app_context():
        db.session.execute(text("TRUNCATE TABLE applications RESTART IDENTITY"))
        db.session.commit()
    yield


@pytest.fixture
def client(app: Flask, clean_db: None) -> FlaskClient:
    return app.test_client()


@pytest.fixture
def make_application(app: Flask, clean_db: None) -> Callable[..., int]:
    """Inserta una postulación directo en la base y devuelve su id.

    Sirve para preparar datos rápido sin pasar por la API.
    """

    def _make(**overrides: Any) -> int:
        values: dict[str, Any] = {
            "company": "Empresa",
            "position": "Becario",
            "status": "applied",
            "applied_on": TODAY,
        }
        values.update(overrides)
        with app.app_context():
            application = Application(**values)
            db.session.add(application)
            db.session.commit()
            return application.id

    return _make
