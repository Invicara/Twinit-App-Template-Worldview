import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { omapiRequest } from './omapiClient'

export function useAircraft(namespace, bbox, enabled) {
  return useQuery({
    queryKey: [
      'world-view-aircraft',
      bbox?.lamin,
      bbox?.lomin,
      bbox?.lamax,
      bbox?.lomax
    ],
    queryFn: async () => {
      const result = await omapiRequest(namespace, '/world-view/aircraft', {
        query: {
          lamin: bbox.lamin,
          lomin: bbox.lomin,
          lamax: bbox.lamax,
          lomax: bbox.lomax
        }
      })
      return Array.isArray(result?.aircraft) ? result.aircraft : []
    },
    enabled: Boolean(namespace && enabled && bbox),
    placeholderData: keepPreviousData,
    refetchInterval: enabled ? 30000 : false,
    staleTime: 20000
  })
}
