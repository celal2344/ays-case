import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProductBody, ProductPatchBody } from '@ays/validators'

import { productKeys } from '@/features/products/query-keys'
import type { ProductDetail } from '@/features/products/schemas'
import type { AppError } from '@/lib/http-error'

import { createProduct, deleteProduct, restoreProduct, updateProduct } from '../api'

/** After any product write, the shop, the detail pages and the admin list are refetched. */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all })
}

export function useCreateProduct() {
  const refresh = useRefresh()
  return useMutation<ProductDetail, AppError, ProductBody>({
    mutationFn: createProduct,
    onSettled: refresh,
  })
}

export function useUpdateProduct() {
  const refresh = useRefresh()
  return useMutation<ProductDetail, AppError, { id: number; patch: ProductPatchBody }>({
    mutationFn: ({ id, patch }) => updateProduct(id, patch),
    onSettled: refresh,
  })
}

export function useDeleteProduct() {
  const refresh = useRefresh()
  const queryClient = useQueryClient()
  return useMutation<void, AppError, number>({
    mutationFn: deleteProduct,
    // carts, favorites and recently viewed lose the product on the server, so they refetch too
    onSettled: async () => {
      await refresh()
      await Promise.all(
        ['cart', 'favorites', 'recently-viewed'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      )
    },
  })
}

export function useRestoreProduct() {
  const refresh = useRefresh()
  return useMutation<ProductDetail, AppError, number>({
    mutationFn: restoreProduct,
    onSettled: refresh,
  })
}
