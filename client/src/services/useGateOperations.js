import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { omapiRequest } from './omapiClient'

export function isGateOpsUnavailable(error) {
  if (!error) return false
  if (error.status === 404) return true
  const message = String(error.message || '')
  return /gates collection is not deployed/i.test(message)
}

export function useGateOperations(namespace, enabled) {
  return useQuery({
    queryKey: ['world-view-gate-operations', namespace],
    queryFn: async () => {
      const result = await omapiRequest(namespace, '/world-view/gate-operations', {
        query: { airport: 'DTW' }
      })
      return {
        available: result?.available !== false,
        generatedAt: result?.generatedAt ?? null,
        attribution: result?.attribution ?? '© OpenStreetMap contributors',
        airport: result?.airport ?? null,
        camera: result?.camera ?? null,
        summary: result?.summary ?? null,
        gates: Array.isArray(result?.gates) ? result.gates : []
      }
    },
    enabled: Boolean(namespace && enabled),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => !isGateOpsUnavailable(error) && failureCount < 2,
    refetchInterval: (query) => {
      if (!enabled) return false
      if (query.state.data?.available === false) return false
      if (isGateOpsUnavailable(query.state.error)) return false
      return 15000
    },
    staleTime: 10000
  })
}
