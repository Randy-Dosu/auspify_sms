"""Step 0 regression: the health route must keep working."""


def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_payload(client):
    body = client.get("/api/health").get_json()
    assert body["status"] == "ok"
    assert body["service"] == "auspify-sms-api"


def test_unknown_route_returns_404(client):
    assert client.get("/api/does-not-exist").status_code == 404


def test_health_is_json(client):
    response = client.get("/api/health")
    assert response.headers["Content-Type"].startswith("application/json")
