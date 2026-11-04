import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useCartStore } from '@/features/cart/store'
import { useFavoritesStore } from '@/features/favorites/store'
import { useRecentlyViewedStore } from '@/features/recently-viewed/store'
import {
  useProductOverlayStore,
  type ProductInput,
  type ProductPatch,
} from '@/features/products/overlay-store'
import { productKeys } from '@/features/products/query-keys'
import type { Product } from '@/features/products/schemas'
import { useReviewsStore } from '@/features/reviews/store'
import type { AppError } from '@/lib/http-error'

// The API has no product writes yet, so admin edits live in the browser overlay only.

export function useCreateProduct() {
  return useMutation<Product, AppError, ProductInput>({
    mutationFn: async (input) => {
      return useProductOverlayStore.getState().create(input)
    },
  })
}

export function useUpdateProduct() {
  return useMutation<void, AppError, { id: number; patch: ProductPatch }>({
    mutationFn: async ({ id, patch }) => {
      useProductOverlayStore.getState().update(id, patch)
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, number>({
    mutationFn: async (id) => {
      useProductOverlayStore.getState().remove(id)
      useCartStore.getState().removeProductEverywhere(id)
      useFavoritesStore.getState().removeProductEverywhere(id)
      useRecentlyViewedStore.getState().removeProductEverywhere(id)
      useReviewsStore.getState().removeProduct(id)
      queryClient.removeQueries({ queryKey: productKeys.detail(id) })
    },
  })
}
