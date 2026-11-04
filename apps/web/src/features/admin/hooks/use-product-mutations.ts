import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useCartStore } from '@/features/cart/store'
import { useFavoritesStore } from '@/features/favorites/store'
import { useRecentlyViewedStore } from '@/features/recently-viewed/store'
import { createProduct, deleteProduct, updateProduct } from '@/features/products/api'
import {
  isLocal,
  useProductOverlayStore,
  type ProductInput,
  type ProductPatch,
} from '@/features/products/overlay-store'
import { productKeys } from '@/features/products/query-keys'
import type { Product } from '@/features/products/schemas'
import { useReviewsStore } from '@/features/reviews/store'
import { toAppError, type AppError } from '@/lib/http-error'

// DummyJSON persists nothing, so every write goes to the overlay too. The overlay is written only
// after the request succeeds: if DummyJSON rejects it, nothing changes and the form shows the error.

export function useCreateProduct() {
  return useMutation<Product, AppError, ProductInput>({
    mutationFn: async (input) => {
      try {
        await createProduct(input)
      } catch (error) {
        throw toAppError(error)
      }
      return useProductOverlayStore.getState().create(input)
    },
  })
}

export function useUpdateProduct() {
  return useMutation<void, AppError, { id: number; patch: ProductPatch }>({
    mutationFn: async ({ id, patch }) => {
      if (!isLocal(id)) {
        try {
          await updateProduct(id, patch)
        } catch (error) {
          throw toAppError(error)
        }
      }
      useProductOverlayStore.getState().update(id, patch)
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, number>({
    mutationFn: async (id) => {
      if (!isLocal(id)) {
        try {
          await deleteProduct(id)
        } catch (error) {
          throw toAppError(error)
        }
      }
      useProductOverlayStore.getState().remove(id)
      useCartStore.getState().removeProductEverywhere(id)
      useFavoritesStore.getState().removeProductEverywhere(id)
      useRecentlyViewedStore.getState().removeProductEverywhere(id)
      useReviewsStore.getState().removeProduct(id)
      queryClient.removeQueries({ queryKey: productKeys.detail(id) })
    },
  })
}
