import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { IafPassSvc } from '@dtplatform/platform-api'

import { SELECTED_PROJECT_KEY, getAccessToken } from '../auth/auth'
import { getProjectNamespace } from '../services/omapiClient'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      setLoading(true)
      setError(null)

      try {
        const ctx = { authToken: getAccessToken() }
        const result = await IafPassSvc.getWorkspaces(
          { _userType: 'project_workspace' },
          ctx,
          { _pageSize: 1000 }
        )
        const list = result?._list ?? []
        if (cancelled) return

        setProjects(list)

        const storedId = sessionStorage.getItem(SELECTED_PROJECT_KEY)
        const stored = list.find((item) => item._id === storedId)
        const next = stored ?? list[0] ?? null
        setProject(next)
        if (next?._id) {
          sessionStorage.setItem(SELECTED_PROJECT_KEY, next._id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ?? 'Unable to list projects')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProjects()
    return () => {
      cancelled = true
    }
  }, [])

  const selectProject = useCallback((next) => {
    setProject(next)
    if (next?._id) {
      sessionStorage.setItem(SELECTED_PROJECT_KEY, next._id)
    }
  }, [])

  const value = useMemo(
    () => ({
      projects,
      project,
      namespace: getProjectNamespace(project),
      loading,
      error,
      selectProject
    }),
    [projects, project, loading, error, selectProject]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const value = useContext(ProjectContext)
  if (!value) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return value
}
