import { useQuery } from '@tanstack/react-query'

import { omapiRequest } from './omapiClient'

export function useSpaceCatalog(namespace, enabled) {
  return useQuery({
    queryKey: ['world-view-space', namespace],
    queryFn: async () => {
      const result = await omapiRequest(namespace, '/world-view/space')
      return {
        fetchedAt: result?.fetchedAt ?? null,
        source: result?.source ?? null,
        objects: Array.isArray(result?.objects) ? result.objects : []
      }
    },
    enabled: Boolean(namespace && enabled),
    refetchInterval: enabled ? 30 * 60 * 1000 : false,
    staleTime: 10 * 60 * 1000
  })
}
