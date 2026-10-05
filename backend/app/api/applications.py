from flask import url_for

from app import clock
from app.api import api_v1
from app.models import Application
from app.schemas import (
    ApplicationCreate,
    ApplicationListParams,
    ApplicationOut,
    ApplicationPage,
    ApplicationUpdate,
)
from app.services import applications as service
from app.validation import parse_json_body, parse_query


def _to_json(application: Application) -> dict:
    return ApplicationOut.model_validate(application).model_dump(mode="json")


@api_v1.get("/applications")
def list_applications():
    params = parse_query(ApplicationListParams)
    page = service.list_applications(params)
    return ApplicationPage(
        items=[ApplicationOut.model_validate(item) for item in page.items],
        page=page.page,
        per_page=page.per_page,
        total=page.total or 0,
        pages=page.pages,
    ).model_dump(mode="json")


@api_v1.post("/applications")
def create_application():
    today = clock.today()
    data = parse_json_body(ApplicationCreate, context={"today": today})
    application = service.create_application(data, today=today)
    location = url_for(".get_application", application_id=application.id)
    return _to_json(application), 201, {"Location": location}


@api_v1.get("/applications/<int:application_id>")
def get_application(application_id: int):
    return _to_json(service.get_application(application_id))


@api_v1.patch("/applications/<int:application_id>")
def update_application(application_id: int):
    application = service.get_application(application_id)
    data = parse_json_body(ApplicationUpdate, context={"today": clock.today()})
    # exclude_unset: solo los campos que el cliente envió (un null explícito sí cuenta).
    service.update_application(application, data.model_dump(exclude_unset=True))
    return _to_json(application)


@api_v1.delete("/applications/<int:application_id>")
def delete_application(application_id: int):
    service.delete_application(service.get_application(application_id))
    return "", 204
