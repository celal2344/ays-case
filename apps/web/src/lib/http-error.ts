import { isAxiosError } from 'axios'

export type AppErrorKind =
  'network' | 'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'server'

export class AppError extends Error {
  readonly kind: AppErrorKind
  readonly status?: number

  constructor(kind: AppErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'AppError'
    this.kind = kind
    this.status = status
  }
}

function kindFromStatus(status: number): AppErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 400 || status === 422) return 'validation'
  return 'server'
}

/** DummyJSON error bodies look like `{ message: string }`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (isAxiosError(error)) {
    if (!error.response) return new AppError('network', error.message)
    const { status, data } = error.response
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : error.message
    return new AppError(kindFromStatus(status), message, status)
  }
  return new AppError('server', error instanceof Error ? error.message : 'Unknown error')
}
