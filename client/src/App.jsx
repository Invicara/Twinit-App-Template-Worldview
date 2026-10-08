import { lazy, Suspense, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import SignIn from './pages/SignIn'
import { ProjectProvider } from './context/ProjectContext'
import { getAccessToken, handleAuthCallback } from './auth/auth'
import { authEvents } from './services/apiFetch'
import { initializeTwinitSession } from './services/twinitSession'

const WorldView = lazy(() => import('./pages/WorldView'))

const queryClient = new QueryClient()

function BootScreen({ label }) {
  return (
    <div className="gate">
      <div className="gate-scanlines" aria-hidden="true" />
      <p className="hud-stamp">{label}</p>
    </div>
  )
}

function AuthedApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <Suspense fallback={<BootScreen label="ACQUIRING SENSOR FEED" />}>
          <WorldView />
        </Suspense>
      </ProjectProvider>
    </QueryClientProvider>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      await initializeTwinitSession()

      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        try {
          await handleAuthCallback(code)
          window.history.replaceState({}, '', '/')
        } catch (error) {
          if (!cancelled) {
            setAuthError(error?.message ?? 'Authentication failed')
          }
        }
      }

      if (!cancelled) {
        setAuthed(Boolean(getAccessToken()))
        setReady(true)
      }
    }

    boot()

    const onExpired = () => setAuthed(false)
    authEvents.addEventListener('session-expired', onExpired)

    return () => {
      cancelled = true
      authEvents.removeEventListener('session-expired', onExpired)
    }
  }, [])

  if (!ready) {
    return <BootScreen label="INITIALIZING SENSOR BUS" />
  }

  if (!authed) {
    return <SignIn error={authError} />
  }

  return <AuthedApp />
}
