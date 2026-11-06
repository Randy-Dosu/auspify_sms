"""
Database layer for the Student Management System.

We use Python's built-in `sqlite3` module - no ORM, no extra dependency.
This file has exactly three jobs:

  1. open a connection to the SQLite file            -> get_connection()
  2. create the `students` table if it does not exist -> init_db()
  3. give each request a connection, and close it      -> get_db()

The database file is created automatically the first time the backend runs.
"""

import sqlite3
from pathlib import Path

from flask import current_app, g

# Where the database file lives by default: backend/students.db
# (Path(__file__).resolve().parent is the backend/ folder itself.)
DEFAULT_DB_PATH = Path(__file__).resolve().parent / "students.db"

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
# Notes on the choices here:
#   * AUTOINCREMENT on `id`     -> ids are never reused after a delete.
#   * UNIQUE on student_id/email -> the database itself refuses duplicates,
#                                  even if our Python checks were bypassed.
#   * COLLATE NOCASE             -> "AUS-1" and "aus-1" count as the SAME id.
#   * NOT NULL on the required fields -> the database enforces the basics.
#   * created_at defaults to now  -> we never have to remember to set it.
CREATE_STUDENTS_TABLE = """
CREATE TABLE IF NOT EXISTS students (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  TEXT    NOT NULL COLLATE NOCASE UNIQUE,
    full_name   TEXT    NOT NULL,
    age         INTEGER NOT NULL,
    gender      TEXT,
    email       TEXT    NOT NULL COLLATE NOCASE UNIQUE,
    phone       TEXT,
    course      TEXT    NOT NULL,
    year        INTEGER,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


def get_connection(db_path=None):
    """Open a connection with a row factory so rows behave like dicts.

    `sqlite3.Row` lets us write `row["full_name"]` instead of `row[1]`,
    which is far easier to read and less error-prone.
    """
    path = db_path or current_app.config["DATABASE"]
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    # Enforce foreign keys now (harmless today, useful if tables are added).
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db(db_path=None):
    """Create the students table if it is missing. Safe to call every start."""
    connection = get_connection(db_path)
    try:
        connection.executescript(CREATE_STUDENTS_TABLE)
        connection.commit()
    finally:
        connection.close()


def get_db():
    """Return ONE connection per request, reusing it for that request.

    Flask's `g` object lives for a single request. Opening one connection
    per request (instead of per query) is both faster and simpler.
    """
    if "db" not in g:
        g.db = get_connection()
    return g.db


def close_db(_exception=None):
    """Close the request's connection. Registered as a teardown handler."""
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def row_to_dict(row):
    """Convert a sqlite3.Row into a plain dict so Flask can jsonify it."""
    return dict(row) if row is not None else None
