/**
 * SearchBar
 * ---------
 * Controlled text input for filtering students by name or student ID.
 *
 * STEP 1: purely visual. App stores the typed text and shows it back, but
 * nothing is filtered yet (there is no data source to filter other than
 * hard-coded dummy rows, and real filtering arrives in Step 4).
 *
 * Props
 *  - value       : current text (owned by App)
 *  - onChange    : called with the new text on every keystroke
 *  - onClear     : called when the "Clear" button is pressed
 *  - resultCount : optional number shown next to the input
 */
function SearchBar({ value = '', onChange, onClear, resultCount }) {
  return (
    <div className="searchbar">
      <div className="searchbar__field">
        <label className="searchbar__label" htmlFor="student-search">
          Search students
        </label>

        <div className="searchbar__input-wrap">
          {/* A decorative magnifier icon; hidden from screen readers */}
          <span className="searchbar__icon" aria-hidden="true">
            🔍
          </span>

          <input
            id="student-search"
            type="search"
            className="searchbar__input"
            placeholder="Search by full name or student ID…"
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            autoComplete="off"
          />

          {/* Only show the clear button when there is something to clear */}
          {value && (
            <button
              type="button"
              className="searchbar__clear"
              onClick={onClear}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {typeof resultCount === 'number' && (
        <p className="searchbar__count">
          <strong>{resultCount}</strong>{' '}
          {resultCount === 1 ? 'student' : 'students'} found
        </p>
      )}
    </div>
  )
}

export default SearchBar
