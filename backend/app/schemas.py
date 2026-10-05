"""Esquemas de Pydantic: validan lo que entra a la API y dan forma a lo que sale.

Las reglas siguen docs/03-api.md. Los mensajes de error se traducen al español en
``app/validation.py``.
"""

from datetime import UTC, date, datetime
from typing import Annotated, Any, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    Strict,
    TypeAdapter,
    ValidationError,
    ValidationInfo,
    field_serializer,
    field_validator,
    model_validator,
)
from pydantic_core import PydanticCustomError

from app.models import Status

_HTTP_URL = TypeAdapter(HttpUrl)


def _check_http_url(value: str) -> str:
    """Acepta solo URL http(s) válidas, pero guarda el texto tal como lo escribió el usuario."""
    try:
        _HTTP_URL.validate_python(value)
    except ValidationError:
        raise PydanticCustomError(
            "invalid_url", "Escribe una URL válida que empiece con http:// o https://."
        ) from None
    return value


# Tipos reutilizables con sus reglas
RequiredText = Annotated[str, Field(min_length=1, max_length=120)]
JobUrl = Annotated[str, Field(max_length=500), AfterValidator(_check_http_url)]
Source = Annotated[str, Field(max_length=60)]
Notes = Annotated[str, Field(max_length=5000)]
# En el cuerpo JSON la fecha debe venir como texto "AAAA-MM-DD" (no como número).
JsonDate = Annotated[date, Strict()]

OPTIONAL_TEXT_FIELDS = ("job_url", "source", "notes")
NON_NULLABLE_FIELDS = ("company", "position", "status", "applied_on")


# --------------------------------------------------------------------------- #
# Entrada: crear y modificar
# --------------------------------------------------------------------------- #
class _ApplicationInput(BaseModel):
    model_config = ConfigDict(
        extra="forbid",  # Rechaza campos desconocidos o que asigna el servidor (id, created_at...).
        str_strip_whitespace=True,  # Quita espacios al inicio y al final.
        use_enum_values=True,  # Guarda el estado como texto ("applied"), no como Enum.
    )

    @field_validator(*OPTIONAL_TEXT_FIELDS, mode="before", check_fields=False)
    @classmethod
    def _blank_to_none(cls, value: Any) -> Any:
        # Un campo opcional vacío ("" o "   ") se guarda como null.
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("applied_on", check_fields=False)
    @classmethod
    def _not_in_future(cls, value: date | None, info: ValidationInfo) -> date | None:
        today = (info.context or {}).get("today")
        if value is not None and today is not None and value > today:
            raise PydanticCustomError("future_date", "La fecha no puede ser futura.")
        return value


class ApplicationCreate(_ApplicationInput):
    company: RequiredText
    position: RequiredText
    status: Status = Status.APPLIED
    applied_on: JsonDate | None = None  # Si no se envía, se usa la fecha de hoy.
    job_url: JobUrl | None = None
    source: Source | None = None
    notes: Notes | None = None


class ApplicationUpdate(_ApplicationInput):
    """Todos los campos son opcionales: solo se cambian los que se envían."""

    company: RequiredText | None = None
    position: RequiredText | None = None
    status: Status | None = None
    applied_on: JsonDate | None = None
    job_url: JobUrl | None = None
    source: Source | None = None
    notes: Notes | None = None

    @field_validator(*NON_NULLABLE_FIELDS, mode="before")
    @classmethod
    def _reject_null(cls, value: Any) -> Any:
        # Los campos obligatorios se pueden cambiar, pero no vaciar.
        if value is None:
            raise PydanticCustomError("null_not_allowed", "Este campo no puede ser nulo.")
        return value

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "ApplicationUpdate":
        if not self.model_fields_set:
            raise PydanticCustomError("empty_update", "Envía al menos un campo para actualizar.")
        return self


# --------------------------------------------------------------------------- #
# Entrada: parámetros de la lista
# --------------------------------------------------------------------------- #
SortOption = Literal[
    "applied_on",
    "-applied_on",
    "company",
    "-company",
    "status",
    "-status",
    "created_at",
    "-created_at",
]


class ApplicationListParams(BaseModel):
    model_config = ConfigDict(
        extra="ignore",  # En la URL se ignoran parámetros desconocidos.
        str_strip_whitespace=True,
        use_enum_values=True,
    )

    status: Status | None = None
    q: Annotated[str, Field(max_length=100)] | None = None
    applied_from: date | None = None
    applied_to: date | None = None
    sort: SortOption = "-applied_on"
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)

    @field_validator("status", "q", "applied_from", "applied_to", mode="before")
    @classmethod
    def _blank_to_none(cls, value: Any) -> Any:
        # `?status=` (vacío) equivale a no filtrar.
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("applied_to")
    @classmethod
    def _valid_range(cls, value: date | None, info: ValidationInfo) -> date | None:
        start = info.data.get("applied_from")
        if value is not None and start is not None and start > value:
            raise PydanticCustomError(
                "invalid_range", "La fecha final no puede ser anterior a la inicial."
            )
        return value


# --------------------------------------------------------------------------- #
# Salida
# --------------------------------------------------------------------------- #
class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # Se construye desde el modelo de SQLAlchemy.

    id: int
    company: str
    position: str
    status: Status
    applied_on: date
    job_url: str | None
    source: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _as_utc(self, value: datetime) -> str:
        # Siempre en UTC con formato ISO 8601, por ejemplo "2026-09-28T17:05:11Z".
        return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


class ApplicationPage(BaseModel):
    items: list[ApplicationOut]
    page: int
    per_page: int
    total: int
    pages: int


class MonthCount(BaseModel):
    month: str
    count: int


class StatsOut(BaseModel):
    total: int
    by_status: dict[str, int]
    response_rate: float
    interview_rate: float
    by_month: list[MonthCount]
