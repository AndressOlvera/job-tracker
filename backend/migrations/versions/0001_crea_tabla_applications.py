"""Crea la tabla applications.

Revision ID: 0001
Revises:
Create Date: 2026-10-05

Generada con `flask db migrate` y revisada a mano. Debe coincidir con
docs/02-modelo-de-datos.md.
"""

import sqlalchemy as sa
from alembic import op

# Identificadores que usa Alembic para ordenar las migraciones.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("company", sa.String(length=120), nullable=False),
        sa.Column("position", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="applied", nullable=False),
        sa.Column("applied_on", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("job_url", sa.String(length=500), nullable=True),
        sa.Column("source", sa.String(length=60), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('applied', 'interview', 'offer', 'rejected')",
            name=op.f("ck_applications_status"),
        ),
        sa.CheckConstraint(
            "length(trim(company)) > 0", name=op.f("ck_applications_company_not_blank")
        ),
        sa.CheckConstraint(
            "length(trim(position)) > 0", name=op.f("ck_applications_position_not_blank")
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_applications_status", "applications", ["status"])
    op.create_index(
        "ix_applications_applied_on", "applications", [sa.literal_column("applied_on DESC")]
    )


def downgrade():
    op.drop_index("ix_applications_applied_on", table_name="applications")
    op.drop_index("ix_applications_status", table_name="applications")
    op.drop_table("applications")
