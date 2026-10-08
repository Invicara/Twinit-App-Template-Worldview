import { useQuery } from '@tanstack/react-query'

import { omapiRequest } from './omapiClient'
import { DEFAULT_WORLD_VIEW_CONFIG } from './worldViewConfig'

export function useWorldViewConfig(namespace) {
  return useQuery({
    queryKey: ['world-view-config', namespace],
    queryFn: async () => {
      try {
        const config = await omapiRequest(namespace, '/world-view/config')
        return { ...DEFAULT_WORLD_VIEW_CONFIG, ...config }
      } catch {
        return DEFAULT_WORLD_VIEW_CONFIG
      }
    },
    enabled: Boolean(namespace)
  })
}
