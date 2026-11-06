/**
 * api.js - one small, boring place where every backend call lives.
 *
 * Keeping fetch() calls out of components means:
 *   - the base URL is defined once (easy to change later)
 *   - error handling is consistent: every failure throws an ApiError with a
 *     message we can show the user directly
 *   - components stay focused on UI
 *
 * Why a RELATIVE "/api/..." path? The Vite dev server proxies /api to Flask
 * on port 5000 (see vite.config.js). Same origin => no CORS headaches, and in
 * production the same paths work when both are served from one host.
 */

const BASE_URL = '/api'

/**
 * A predictable error type so the UI can tell "validation failed" apart from
 * "the server is offline".
 *
 * properties:
 *   status      - HTTP status code (0 when the request never reached the server)
 *   fields      - { fieldName: "message" } for 400/409 responses
 *   isNetwork   - true when the backend could not be reached at all
 */
export class ApiError extends Error {
  constructor(message, { status = 0, fields = {}, isNetwork = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.isNetwork = isNetwork
  }
}

/** Turn a fetch failure into a friendly, actionable message. */
function networkError() {
  return new ApiError(
    'Could not reach the server. Is the Flask backend running on port 5000?',
    { isNetwork: true },
  )
}

/**
 * Shared request helper.
 * Returns the parsed JSON body on 2xx, throws ApiError otherwise.
 */
async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    // fetch only rejects for network-level problems (server down, DNS, etc.)
    throw networkError()
  }

  // 204 No Content (used by DELETE) has no body to parse.
  if (response.status === 204) return null

  let body = null
  try {
    body = await response.json()
  } catch {
    // A non-JSON body (e.g. an HTML error page) must not crash the app.
    if (!response.ok) {
      throw new ApiError(`Server error (HTTP ${response.status})`, {
        status: response.status,
      })
    }
  }

  if (!response.ok) {
    throw new ApiError(body?.error || `Request failed (HTTP ${response.status})`, {
      status: response.status,
      fields: body?.errors || {},
    })
  }

  return body
}

// ---------------------------------------------------------------------------
// Student endpoints
// ---------------------------------------------------------------------------

/** POST /api/students - create a student. */
export function createStudent(payload) {
  return request('/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
