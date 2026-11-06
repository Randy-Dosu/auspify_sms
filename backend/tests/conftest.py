"""
Shared pytest fixtures.

Key idea: every test gets its OWN empty temporary database, so tests never
touch backend/students.db and never depend on each other's data. That makes
the suite repeatable and safe to run any number of times.
"""

import sys
from pathlib import Path

import pytest

# Make `import app` work no matter which directory pytest was launched from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import app as flask_app  # noqa: E402  (import after sys.path tweak)
from db import init_db  # noqa: E402


@pytest.fixture()
def app(tmp_path):
    """A Flask app pointed at a brand-new temporary SQLite file."""
    db_file = tmp_path / "test_students.db"

    flask_app.config.update(
        TESTING=True,
        DATABASE=str(db_file),
    )

    # Create the schema in the temp file.
    init_db(str(db_file))

    yield flask_app

    # Nothing to tear down: tmp_path is removed by pytest automatically.


@pytest.fixture()
def client(app):
    """Flask's test client - lets us call routes without a real server."""
    return app.test_client()


@pytest.fixture()
def db_conn(app):
    """Direct database access, for asserting what was really persisted."""
    import sqlite3

    connection = sqlite3.connect(app.config["DATABASE"])
    connection.row_factory = sqlite3.Row
    yield connection
    connection.close()


# ---------------------------------------------------------------------------
# Reusable sample data
# ---------------------------------------------------------------------------

@pytest.fixture()
def valid_student():
    """A complete, valid payload we can tweak per test."""
    return {
        "student_id": "AUS-2024-001",
        "full_name": "Ama Serwaa Mensah",
        "age": 20,
        "gender": "Female",
        "email": "ama.mensah@example.com",
        "phone": "+233241112233",
        "course": "Computer Science",
        "year": 2,
    }


@pytest.fixture()
def created_student(client, valid_student):
    """Create one student through the API and return the stored record."""
    response = client.post("/api/students", json=valid_student)
    assert response.status_code == 201, response.get_json()
    return response.get_json()
