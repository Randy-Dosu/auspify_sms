"""GET /api/students/<id> - fetching a single student (Step 4)."""


def test_get_single_student(client, created_student):
    response = client.get(f"/api/students/{created_student['id']}")

    assert response.status_code == 200
    body = response.get_json()
    assert body["id"] == created_student["id"]
    assert body["student_id"] == created_student["student_id"]


def test_get_missing_student_returns_404(client):
    response = client.get("/api/students/999999")

    assert response.status_code == 404
    assert "not found" in response.get_json()["error"].lower()


def test_get_non_numeric_id_returns_404(client):
    """The route only matches integers, so /abc is simply not a route."""
    assert client.get("/api/students/abc").status_code == 404


def test_get_negative_id_returns_404(client):
    assert client.get("/api/students/-1").status_code == 404


def test_get_after_delete_returns_404(client, created_student):
    client.delete(f"/api/students/{created_student['id']}")
    assert client.get(f"/api/students/{created_student['id']}").status_code == 404
