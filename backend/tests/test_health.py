"""
Test for health check endpoint
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def test_db():
    """Create a test database"""
    # In a real implementation, we would create a test database
    # For now, we'll just use the default
    pass


def test_health_check(client):
    """Test the health check endpoint"""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "version" in response.json()
    assert "application" in response.json()


def test_root_endpoint(client):
    """Test the root endpoint"""
    response = client.get("/")
    
    assert response.status_code == 200
    assert "application" in response.json()
    assert "version" in response.json()
    assert "docs" in response.json()


def test_docs_endpoint(client):
    """Test the API documentation endpoint"""
    response = client.get("/docs")
    
    assert response.status_code == 200


def test_openapi_endpoint(client):
    """Test the OpenAPI schema endpoint"""
    response = client.get("/openapi.json")
    
    assert response.status_code == 200
    assert "openapi" in response.json()
    assert "info" in response.json()
