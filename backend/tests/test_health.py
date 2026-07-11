"""Health endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    """Verify the health endpoint returns a healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "Beacon"


def test_root_endpoint() -> None:
    """Verify the root endpoint returns API information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Beacon API"


def test_auth_me_requires_token() -> None:
    """Verify the current-user endpoint is protected."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
