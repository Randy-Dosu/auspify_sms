/**
 * SearchBar
 * ---------
 * Controlled text input for filtering students by name or student ID.
 *
 * STEP 4: the text is sent to the server as `?search=` (debounced in App), so
 * filtering happens in SQL rather than in the browser. That scales to
 * thousands of students and keeps one source of truth.
 *
 * Props
 *  - value       : current text (owned by App)
 *  - onChange    : called with the new text on every keystroke
 *  - onClear     : called when the clear (x) button is pressed
 *  - isSearching : true while a request is in flight (shows a spinner)
 */
function SearchBar({ value = '', onChange, onClear, isSearching = false }) {
  return (
    <div className="searchbar">
      <label className="searchbar__label" htmlFor="student-search">
        Search students
      </label>

      <div className="searchbar__input-wrap">
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
          aria-describedby="student-search-help"
        />

        {/* The spinner sits to the LEFT of the clear button rather than
            replacing it: the user must always be able to clear the search,
            even while a request is still running. */}
        {isSearching && <span className="searchbar__spinner" aria-hidden="true" />}

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

      <p className="searchbar__help" id="student-search-help">
        Matches part of a name or student ID, ignoring case.
      </p>
    </div>
  )
}

export default SearchBar
