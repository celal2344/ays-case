import type { AppError } from './http-error'

/** Maps an AppError kind to an i18n key under `errors.*`. */
export function errorMessageKey(error: AppError) {
  switch (error.kind) {
    case 'network':
      return 'errors.network' as const
    case 'unauthorized':
      return 'errors.unauthorized' as const
    case 'forbidden':
      return 'errors.forbidden' as const
    case 'not_found':
      return 'errors.notFound' as const
    case 'validation':
      return 'errors.validation' as const
    case 'server':
      return 'errors.server' as const
  }
}

/**
 * A translated message for the API error codes the UI explains in its own words (checkout shortage,
 * duplicate review); other errors fall back to the kind-based message.
 */
export function errorCodeKey(error: AppError) {
  switch (error.code) {
    case 'cart_empty':
      return 'checkout.errors.empty' as const
    case 'insufficient_stock':
    case 'product_unavailable':
      return 'checkout.errors.stock' as const
    case 'review_exists':
      return 'reviews.form.exists' as const
    case 'out_of_stock':
      return 'checkout.errors.stock' as const
    case 'duplicate':
      return 'admin.errors.duplicate' as const
    case 'in_use':
      return 'admin.errors.inUse' as const
    case 'unknown_reference':
      return 'admin.errors.unknownReference' as const
    default:
      return errorMessageKey(error)
  }
}
