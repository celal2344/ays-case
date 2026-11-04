import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

import type { AppError } from './http-error'

/**
 * A mutation that updates the cached list straight away, rolls it back if the request fails, and
 * refetches once the last in-flight mutation on the same key has settled.
 */
export function useOptimisticMutation<TCache, TVars>({
  queryKey,
  mutationFn,
  update,
  onError,
}: {
  queryKey: QueryKey
  mutationFn: (vars: TVars) => Promise<unknown>
  /** The cached list after the change; `old` is undefined while nothing is cached yet. */
  update: (old: TCache | undefined, vars: TVars) => TCache
  onError?: (error: AppError, vars: TVars) => void
}) {
  const queryClient = useQueryClient()
  return useMutation<unknown, AppError, TVars, { previous: TCache | undefined }>({
    mutationKey: queryKey,
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TCache>(queryKey)
      queryClient.setQueryData<TCache>(queryKey, (old) => update(old, vars))
      return { previous }
    },
    onError: (error, vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
      onError?.(error, vars)
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: queryKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
