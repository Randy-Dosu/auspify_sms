/**
 * StudentForm
 * -----------
 * The "add / edit a student" form.
 *
 * STEP 1: UI ONLY.
 *  - There is no validation and no API call yet (those arrive in Step 2).
 *  - It is a CONTROLLED form: App owns the values and passes them down.
 *    Submitting simply hands the values back to App, which shows a
 *    notification. That is enough to prove every field and button works.
 *
 * Props
 *  - values      : { full_name, student_id, age, gender, email, phone,
 *                    course, year }  (all strings, because inputs are strings)
 *  - onChange    : (fieldName, newValue) => void
 *  - onSubmit    : form submit handler (App decides what happens)
 *  - onClear     : reset the form
 *  - isEditing   : true when a row has been loaded for editing (Step 3)
 *  - onCancelEdit: leave edit mode (Step 3)
 */

// Options for the two <select> inputs. Kept here because only this form uses them.
const GENDERS = ['Female', 'Male', 'Other']
const YEARS = [1, 2, 3, 4, 5]

function StudentForm({
  values,
  onChange,
  onSubmit,
  onClear,
  isEditing = false,
  onCancelEdit,
}) {
  // Tiny helper so each input stays a one-liner.
  const set = (field) => (event) => onChange?.(field, event.target.value)

  return (
    <section className="card" aria-labelledby="form-title">
      <div className="card__header">
        <h2 className="card__title" id="form-title">
          {isEditing ? 'Edit student' : 'Add a new student'}
        </h2>
        <span className="badge">Step 1 · static UI</span>
      </div>

      {/* Submit is handled by App - no <form action> because there is no backend yet */}
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault() // stop the browser reloading the page
          onSubmit?.()
        }}
        noValidate // we will write our own friendly validation in Step 2
      >
        <div className="form__grid">
          {/* ---- Required fields are marked with a red asterisk ---- */}
          <div className="form__group">
            <label className="form__label" htmlFor="full_name">
              Full name <span className="req">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              className="form__input"
              type="text"
              placeholder="e.g. Ama Serwaa Mensah"
              value={values.full_name}
              onChange={set('full_name')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="student_id">
              Student ID <span className="req">*</span>
            </label>
            <input
              id="student_id"
              name="student_id"
              className="form__input"
              type="text"
              placeholder="e.g. AUS-2024-001"
              value={values.student_id}
              onChange={set('student_id')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="age">
              Age <span className="req">*</span>
            </label>
            <input
              id="age"
              name="age"
              className="form__input"
              type="number"
              min="1"
              placeholder="e.g. 20"
              value={values.age}
              onChange={set('age')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              className="form__input"
              value={values.gender}
              onChange={set('gender')}
            >
              <option value="">Select…</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="email">
              Email <span className="req">*</span>
            </label>
            <input
              id="email"
              name="email"
              className="form__input"
              type="email"
              placeholder="e.g. ama.mensah@example.com"
              value={values.email}
              onChange={set('email')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              className="form__input"
              type="tel"
              placeholder="e.g. +233 24 111 2233"
              value={values.phone}
              onChange={set('phone')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="course">
              Course <span className="req">*</span>
            </label>
            <input
              id="course"
              name="course"
              className="form__input"
              type="text"
              placeholder="e.g. Computer Science"
              value={values.course}
              onChange={set('course')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="year">
              Year of study
            </label>
            <select
              id="year"
              name="year"
              className="form__input"
              value={values.year}
              onChange={set('year')}
            >
              <option value="">Select…</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="form__hint">
          <span className="req">*</span> Required fields
        </p>

        {/* ---- Action buttons ---- */}
        <div className="form__actions">
          <button type="submit" className="btn btn--primary">
            {isEditing ? 'Update student' : 'Add student'}
          </button>

          <button type="button" className="btn btn--ghost" onClick={onClear}>
            Clear
          </button>

          {/* Only relevant while editing - appears in Step 3 */}
          {isEditing && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCancelEdit}
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
