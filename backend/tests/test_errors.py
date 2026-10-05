"""Formato común de errores (docs/03-api.md#errores)."""

import logging

import pytest


def test_unknown_route_returns_json_404(client):
    response = client.get("/api/v1/no-existe")

    assert response.status_code == 404
    assert response.get_json() == {
        "error": {"code": "not_found", "message": "El recurso solicitado no existe."}
    }


def test_non_numeric_id_returns_404(client):
    assert client.get("/api/v1/applications/abc").status_code == 404


def test_method_not_allowed(client):
    response = client.put("/api/v1/applications/1", json={})

    assert response.status_code == 405
    assert response.get_json()["error"]["code"] == "method_not_allowed"
    assert "PATCH" in response.headers["Allow"]


def test_unexpected_error_hides_details(client, monkeypatch: pytest.MonkeyPatch, caplog):
    def explode():
        raise RuntimeError("detalle interno secreto")

    monkeypatch.setattr("app.api.stats.compute_stats", explode)

    with caplog.at_level(logging.ERROR):
        response = client.get("/api/v1/stats")

    assert response.status_code == 500
    assert response.get_json() == {
        "error": {"code": "internal_error", "message": "Ocurrió un error inesperado."}
    }
    assert "secreto" not in response.get_data(as_text=True)
    assert "detalle interno secreto" in caplog.text  # Pero sí queda en los logs.
