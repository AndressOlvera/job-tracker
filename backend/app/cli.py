"""Comandos de terminal propios: se ejecutan como `flask <comando>`."""

import random
from datetime import timedelta

import click
from flask import Flask
from flask.cli import with_appcontext
from sqlalchemy import delete

from app import clock
from app.extensions import db
from app.models import Application, Status

COMPANIES = [
    "Oracle", "IBM", "Intel", "HP", "Bosch", "Continental", "Wizeline", "Encora",
    "Globant", "Kueski", "Jalasoft", "Unosquare", "Softtek", "Accenture", "Mercado Libre",
]  # fmt: skip
POSITIONS = [
    "Becario de Ingeniería de Software",
    "Practicante de Desarrollo Backend",
    "Practicante de QA Automation",
    "Becario de Datos",
    "Practicante de Cloud",
    "Becario de DevOps",
    "Desarrollador Jr. Python",
]
SOURCES = ["OCC", "LinkedIn", "Indeed", "Sitio de la empresa", "Referido", None]
# Proporciones aproximadas de una búsqueda real: la mayoría sigue sin respuesta.
STATUS_WEIGHTS = {
    Status.APPLIED: 55,
    Status.INTERVIEW: 20,
    Status.OFFER: 5,
    Status.REJECTED: 20,
}
NOTES = [
    None,
    None,
    "Pidieron portafolio en GitHub.",
    "Prueba técnica de SQL y Python.",
    "Entrevista con el líder técnico.",
    "Dar seguimiento por correo la próxima semana.",
]


@click.command("seed")
@click.option("--count", default=30, show_default=True, type=click.IntRange(1, 1000))
@click.option(
    "--reset", is_flag=True, help="Borra todas las postulaciones antes de crear las nuevas."
)
@with_appcontext
def seed_command(count: int, reset: bool) -> None:
    """Carga postulaciones de ejemplo en la base de datos."""
    if reset:
        db.session.execute(delete(Application))

    rng = random.Random(42)  # Semilla fija: siempre se generan los mismos datos.
    today = clock.today()
    statuses = list(STATUS_WEIGHTS)
    weights = list(STATUS_WEIGHTS.values())

    for number in range(1, count + 1):
        db.session.add(
            Application(
                company=rng.choice(COMPANIES),
                position=rng.choice(POSITIONS),
                status=rng.choices(statuses, weights)[0].value,
                applied_on=today - timedelta(days=rng.randint(0, 120)),
                job_url=f"https://example.com/vacantes/{number}" if rng.random() < 0.7 else None,
                source=rng.choice(SOURCES),
                notes=rng.choice(NOTES),
            )
        )
    db.session.commit()
    click.echo(f"Se crearon {count} postulaciones de ejemplo.")


def register_cli(app: Flask) -> None:
    app.cli.add_command(seed_command)
