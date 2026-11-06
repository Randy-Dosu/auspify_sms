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
  } catch (error) {
    // An aborted request is NOT an error the user should see - the UI
    // cancelled it on purpose (e.g. they typed another search letter).
    if (error?.name === 'AbortError') throw error
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

/**
 * GET /api/students - list students with optional search and sorting.
 * @param {{search?: string, sort?: string, order?: 'asc'|'desc'}} options
 * @returns {Promise<{students: object[], count: number}>}
 */
export function fetchStudents({ search = '', sort = 'created_at', order = 'desc', signal } = {}) {
  // URLSearchParams handles the encoding for us (spaces, &, unicode, ...).
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (order) params.set('order', order)

  const query = params.toString()
  return request(`/students${query ? `?${query}` : ''}`, { signal })
}

/** GET /api/students/:id - one student. */
export function fetchStudent(id) {
  return request(`/students/${id}`)
}

/** POST /api/students - create a student. */
export function createStudent(payload) {
  return request('/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** PUT /api/students/:id - update an existing student. */
export function updateStudent(id, payload) {
  return request(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** DELETE /api/students/:id - remove a student. */
export function deleteStudent(id) {
  return request(`/students/${id}`, { method: 'DELETE' })
}
