import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { omapiRequest } from './omapiClient'

const rosterKey = (namespace) => ['world-view-users', namespace]

export function useUserRoster(namespace, enabled = true) {
  return useQuery({
    queryKey: rosterKey(namespace),
    queryFn: () => omapiRequest(namespace, '/world-view/users'),
    enabled: Boolean(namespace) && enabled
  })
}

export function useAddUser(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email) => omapiRequest(namespace, '/world-view/users', {
      method: 'POST',
      body: { email }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rosterKey(namespace) })
    }
  })
}

export function useRemoveUser(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId) => omapiRequest(namespace, `/world-view/users/${userId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rosterKey(namespace) })
    }
  })
}

export function useInviteUser(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email) => omapiRequest(namespace, '/world-view/invites', {
      method: 'POST',
      body: { email }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rosterKey(namespace) })
    }
  })
}

export function useCancelInvite(namespace) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (inviteId) => omapiRequest(namespace, `/world-view/invites/${inviteId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rosterKey(namespace) })
    }
  })
}
