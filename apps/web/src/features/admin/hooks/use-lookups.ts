import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { productKeys } from '@/features/products/query-keys'
import type { AppError } from '@/lib/http-error'

import { lookupApis, type LookupInput, type LookupRow } from '../lookups-api'
import type { LookupKind } from '../lookups'

const lookupKey = (kind: LookupKind) => ['admin', 'lookups', kind] as const

/** The rows of one lookup table (categories, brands, tags or a policy table). */
export function useLookups(kind: LookupKind) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: lookupKey(kind),
    queryFn: lookupApis[kind].list,
    staleTime: 30_000,
  })
  return { rows: data, isPending, isError, refetch }
}

/** Create, edit and delete a row; the lookup list and everything that shows names refetch. */
export function useLookupMutations(kind: LookupKind) {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: lookupKey(kind) }),
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
    ])
  const api = lookupApis[kind]
  return {
    create: useMutation<LookupRow, AppError, LookupInput>({
      mutationFn: api.create,
      onSettled: refresh,
    }),
    update: useMutation<LookupRow, AppError, { id: number; input: LookupInput }>({
      mutationFn: ({ id, input }) => api.update(id, input),
      onSettled: refresh,
    }),
    remove: useMutation<void, AppError, number>({ mutationFn: api.remove, onSettled: refresh }),
  }
}
