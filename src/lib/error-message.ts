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
