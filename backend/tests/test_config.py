"""Configuración por entorno (no necesitan base de datos)."""

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import pytest

from app import create_app
from app.clock import today as real_today  # Se importa antes de que la prueba lo reemplace.
from app.config import get_config, normalize_database_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgresql://u:p@host:5432/db", "postgresql+psycopg://u:p@host:5432/db"),
        ("postgres://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql+psycopg://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
    ],
)
def test_normalize_database_url(url, expected):
    assert normalize_database_url(url) == expected


def test_development_reads_database_url(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db:5432/dev")

    config = get_config("development")

    assert config["SQLALCHEMY_DATABASE_URI"] == "postgresql+psycopg://u:p@db:5432/dev"
    assert config["TESTING"] is False


def test_environment_comes_from_app_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_ENV", "testing")

    assert get_config()["TESTING"] is True


def test_production_requires_database_url(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_config("production")


def test_production_reads_database_url(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@rds.amazonaws.com:5432/jobtracker")

    config = get_config("production")

    assert config["SQLALCHEMY_DATABASE_URI"].startswith("postgresql+psycopg://")
    assert config["TESTING"] is False


def test_rejects_unknown_environment():
    with pytest.raises(ValueError, match="APP_ENV"):
        get_config("staging")


def test_rejects_unknown_timezone(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_TIMEZONE", "Marte/Olympus")

    with pytest.raises(ZoneInfoNotFoundError):
        get_config("testing")


def test_today_uses_configured_timezone(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_TIMEZONE", "Pacific/Kiritimati")  # UTC+14
    app = create_app("testing")

    with app.app_context():
        assert real_today() == datetime.now(ZoneInfo("Pacific/Kiritimati")).date()
