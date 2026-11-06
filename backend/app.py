"""
Student Management System - Flask backend
=========================================

STEP 0: Project setup.

For this step the backend does one thing: it exposes a tiny health-check
route so we can prove that
  1. Flask is installed and running, and
  2. the React dev server is allowed to talk to it (CORS works).

Run it with:
    python app.py
"""

from flask import Flask, jsonify
# CORS = Cross-Origin Resource Sharing.
# The React app runs on http://localhost:5173 while Flask runs on
# http://127.0.0.1:5000 -> different "origins". Browsers block that by
# default, so we explicitly allow it here.
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Application factory-style setup (kept simple and explicit for beginners)
# ---------------------------------------------------------------------------

app = Flask(__name__)

# Allow the React dev server to call every /api/* route.
# In development we allow a few common Vite ports so the app keeps working
# if port 5173 is already taken and Vite falls back to 5174, etc.
CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]}},
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    """Simple health check the frontend calls on page load.

    Returning JSON (not a plain string) proves that the JSON pipeline
    frontend -> backend -> frontend works end to end.
    """
    return jsonify(
        status="ok",
        service="auspify-sms-api",
        message="Flask backend is running",
    ), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # host="0.0.0.0" makes the server reachable from outside the container
    # (needed for the live preview). Port 5000 is what the Vite proxy uses.
    # debug=True gives auto-reload + readable error pages while developing.
    app.run(host="0.0.0.0", port=5000, debug=True)
