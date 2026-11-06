/**
 * Client-side form validation.
 *
 * This mirrors backend/validators.py on purpose. It is NOT a replacement for
 * server-side checks (anyone can bypass the browser) - it exists purely so the
 * user gets instant feedback without waiting for a round trip.
 *
 * Always trust the server's answer if the two ever disagree.
 */

// Same practical email rule the server uses.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/

const REQUIRED = {
  student_id: 'Student ID is required',
  full_name: 'Full name is required',
  age: 'Age is required',
  email: 'Email is required',
  course: 'Course is required',
}

export const AGE_MIN = 1
export const AGE_MAX = 120

/**
 * @param {object} values - form values (all strings, straight from inputs)
 * @returns {object} errors - { field: message }. Empty object means valid.
 */
export function validateStudent(values) {
  const errors = {}

  // ---- required text fields ----
  for (const [field, message] of Object.entries(REQUIRED)) {
    if (field === 'age') continue // handled separately below
    const value = String(values[field] ?? '').trim()
    if (!value) errors[field] = message
  }

  // ---- email format ----
  const email = String(values.email ?? '').trim()
  if (email && !errors.email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address (e.g. name@example.com)'
  }

  // ---- age: must be a whole number in range ----
  const rawAge = String(values.age ?? '').trim()
  if (!rawAge) {
    errors.age = REQUIRED.age
  } else if (!/^\d+$/.test(rawAge)) {
    errors.age = 'Age must be a whole number (no decimals or letters)'
  } else {
    const age = Number(rawAge)
    if (age < AGE_MIN || age > AGE_MAX) {
      errors.age = `Age must be between ${AGE_MIN} and ${AGE_MAX}`
    }
  }

  // ---- year: optional, but if present must be a number in range ----
  const rawYear = String(values.year ?? '').trim()
  if (rawYear) {
    if (!/^\d+$/.test(rawYear)) {
      errors.year = 'Year must be a whole number'
    } else {
      const year = Number(rawYear)
      if (year < 1 || year > 10) errors.year = 'Year must be between 1 and 10'
    }
  }

  return errors
}

/**
 * Convert the form's string values into the JSON body the API expects.
 * Numbers must be real numbers, and empty optional fields must be null
 * (not ""), so the database stores NULL rather than an empty string.
 */
export function toApiPayload(values) {
  // `text()` tolerates a missing/undefined key so a partially-filled object
  // can never crash the submit handler with "cannot read property trim".
  const text = (key) => String(values[key] ?? '').trim()

  return {
    student_id: text('student_id'),
    full_name: text('full_name'),
    age: Number(values.age),
    gender: values.gender || null,
    email: text('email').toLowerCase(),
    phone: text('phone') || null,
    course: text('course'),
    year: values.year ? Number(values.year) : null,
  }
}
