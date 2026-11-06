/**
 * StudentForm
 * -----------
 * The "add / edit a student" form.
 *
 * STEP 2: connected to the API.
 *  - It is a CONTROLLED form: App owns the values and passes them down.
 *  - App runs the validation and the POST request, then passes back an
 *    `errors` object ({ field: message }) which this component displays
 *    under the offending input.
 *  - While a request is in flight `isSubmitting` disables the buttons so the
 *    user cannot double-submit and create two records.
 *
 * Props
 *  - values      : { full_name, student_id, age, gender, email, phone,
 *                    course, year }  (all strings, because inputs are strings)
 *  - onChange    : (fieldName, newValue) => void
 *  - onSubmit    : form submit handler (App decides what happens)
 *  - onClear     : reset the form
 *  - isEditing   : true when a row has been loaded for editing (Step 3)
 *  - onCancelEdit: leave edit mode (Step 3)
 *  - errors      : { fieldName: "message" } shown under each input
 *  - isSubmitting: true while the request is in flight
 */

// Options for the two <select> inputs.
const GENDERS = ['Female', 'Male', 'Other']
const YEARS = [1, 2, 3, 4, 5]

/**
 * A tiny presentational component for one field: label + control + error.
 * Writing it once keeps the markup below short and guarantees every field
 * behaves the same way (same classes, same aria attributes).
 */
function Field({ id, label, required = false, error, hint, children }) {
  return (
    <div className={`form__group${error ? ' form__group--invalid' : ''}`}>
      <label className="form__label" htmlFor={id}>
        {label} {required && <span className="req">*</span>}
      </label>

      {children}

      {hint && !error && <p className="form__hint-text">{hint}</p>}

      {error && (
        <p className="form__error" role="alert" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

function StudentForm({
  values,
  onChange,
  onSubmit,
  onClear,
  isEditing = false,
  onCancelEdit,
  errors = {},
  isSubmitting = false,
}) {
  // Tiny helper so each input stays a one-liner.
  const set = (field) => (event) => onChange?.(field, event.target.value)

  // Shared props for every text input. aria-invalid + aria-describedby make
  // the error discoverable by screen readers, not just visible.
  const inputProps = (field) => ({
    id: field,
    name: field,
    className: `form__input${errors[field] ? ' form__input--invalid' : ''}`,
    value: values[field],
    onChange: set(field),
    disabled: isSubmitting,
    'aria-invalid': errors[field] ? 'true' : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  return (
    <section className="card" aria-labelledby="form-title">
      <div className="card__header">
        <h2 className="card__title" id="form-title">
          {isEditing ? 'Edit student' : 'Add a new student'}
        </h2>
        <span className="badge">
          {isEditing ? 'Editing existing record' : 'New record'}
        </span>
      </div>

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault() // stop the browser reloading the page
          if (!isSubmitting) onSubmit?.()
        }}
        noValidate // we show our own friendly validation messages instead
      >
        <div className="form__grid">
          <Field id="full_name" label="Full name" required error={errors.full_name}>
            <input
              {...inputProps('full_name')}
              type="text"
              placeholder="e.g. Ama Serwaa Mensah"
              autoComplete="name"
            />
          </Field>

          <Field id="student_id" label="Student ID" required error={errors.student_id}>
            <input
              {...inputProps('student_id')}
              type="text"
              placeholder="e.g. AUS-2024-001"
              autoComplete="off"
            />
          </Field>

          <Field id="age" label="Age" required error={errors.age}>
            <input
              {...inputProps('age')}
              type="number"
              min="1"
              max="120"
              step="1"
              placeholder="e.g. 20"
              inputMode="numeric"
            />
          </Field>

          <Field id="gender" label="Gender" error={errors.gender}>
            <select {...inputProps('gender')}>
              <option value="">Select…</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </Field>

          <Field id="email" label="Email" required error={errors.email}>
            <input
              {...inputProps('email')}
              type="email"
              placeholder="e.g. ama.mensah@example.com"
              autoComplete="email"
            />
          </Field>

          <Field id="phone" label="Phone" error={errors.phone}>
            <input
              {...inputProps('phone')}
              type="tel"
              placeholder="e.g. +233 24 111 2233"
              autoComplete="tel"
            />
          </Field>

          <Field id="course" label="Course" required error={errors.course}>
            <input
              {...inputProps('course')}
              type="text"
              placeholder="e.g. Computer Science"
            />
          </Field>

          <Field id="year" label="Year of study" error={errors.year}>
            <select {...inputProps('year')}>
              <option value="">Select…</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="form__hint">
          <span className="req">*</span> Required fields
        </p>

        <div className="form__actions">
          {/* Disabled while saving so a double-click cannot create 2 records */}
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving…'
              : isEditing
                ? 'Update student'
                : 'Add student'}
          </button>

          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClear}
            disabled={isSubmitting}
          >
            Clear
          </button>

          {isEditing && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCancelEdit}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

export default StudentForm
