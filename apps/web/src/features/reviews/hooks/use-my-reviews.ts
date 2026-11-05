import { useQuery } from '@tanstack/react-query'

import { selectUser, useAuthStore } from '@/features/auth/store'

import { listMyReviewedIds } from '../api'

export const myReviewsKey = ['reviews', 'mine'] as const

/** The ids of the products the signed-in user has already reviewed. */
export function useMyReviewedIds() {
  const signedIn = useAuthStore(selectUser) !== null
  const query = useQuery({ queryKey: myReviewsKey, queryFn: listMyReviewedIds, enabled: signedIn })
  return { reviewed: new Set(query.data ?? []), isPending: query.isPending }
}
