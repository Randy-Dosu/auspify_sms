import { useEffect, useState } from 'react'
import './App.css'

/**
 * STEP 0 - Project setup screen.
 *
 * This is NOT the final UI yet (that is Step 1). It is a minimal page whose
 * only job is to prove the three Step 0 requirements:
 *   1. React dev server loads in the browser   -> you can see this page
 *   2. Flask /api/health responds              -> the JSON below is shown
 *   3. The frontend can call the backend        -> status becomes "connected"
 *
 * We call "/api/health" (a RELATIVE url) so the Vite proxy forwards it to
 * Flask on port 5000. See vite.config.js.
 */

// Small helper so the UI can show "checking" / "online" / "offline" clearly.
const STATUS = {
  CHECKING: 'checking',
  ONLINE: 'online',
  OFFLINE: 'offline',
}

function App() {
  const [status, setStatus] = useState(STATUS.CHECKING)
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')

  // Runs once when the page loads: ask Flask "are you alive?".
  useEffect(() => {
    let cancelled = false // avoids updating state after unmount

    async function checkHealth() {
      setStatus(STATUS.CHECKING)
      setError('')
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error(`Backend replied with HTTP ${response.status}`)
        }
        const data = await response.json()
        if (cancelled) return
        setPayload(data)
        setStatus(STATUS.ONLINE)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setStatus(STATUS.OFFLINE)
      }
    }

    checkHealth()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page">
      <header className="header">
        <h1>Student Management System</h1>
        <p className="subtitle">Step 0 &mdash; Project setup &amp; connection check</p>
      </header>

      <section className="card">
        <h2>Backend connection</h2>

        {status === STATUS.CHECKING && (
          <p className="status checking" data-testid="status">
            Checking <code>/api/health</code>&hellip;
          </p>
        )}

        {status === STATUS.ONLINE && (
          <>
            <p className="status online" data-testid="status">
              &#10004; Connected to the Flask backend
            </p>
            <pre className="json">{JSON.stringify(payload, null, 2)}</pre>
          </>
        )}

        {status === STATUS.OFFLINE && (
          <>
            <p className="status offline" data-testid="status">
              &#10008; Could not reach the backend
            </p>
            <p className="hint">
              {error}. Is Flask running on port 5000? Start it with{' '}
              <code>python app.py</code> inside <code>backend/</code>.
            </p>
          </>
        )}
      </section>

      <section className="card muted">
        <h2>What comes next</h2>
        <p>
          Step 1 builds the real interface (form, table, search, dialogs). This
          page exists only to verify the toolchain works.
        </p>
      </section>
    </main>
  )
}

export default App
