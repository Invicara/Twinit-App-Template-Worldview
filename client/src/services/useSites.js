import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { omapiRequest } from './omapiClient'

export function useSites(namespace) {
  return useQuery({
    queryKey: ['world-view-sites', namespace],
    queryFn: async () => {
      const result = await omapiRequest(namespace, '/world-view/sites')
      return result?.sites ?? []
    },
    enabled: Boolean(namespace)
  })
}

export function useCreateSite(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (site) => omapiRequest(namespace, '/world-view/sites', {
      method: 'POST',
      body: site
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world-view-sites', namespace] })
    }
  })
}

export function useUpdateSite(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...site }) => omapiRequest(namespace, `/world-view/sites/${id}`, {
      method: 'PUT',
      body: site
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world-view-sites', namespace] })
    }
  })
}

export function useDeleteSite(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => omapiRequest(namespace, `/world-view/sites/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world-view-sites', namespace] })
    }
  })
}
