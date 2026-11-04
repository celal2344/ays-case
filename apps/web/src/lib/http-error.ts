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

export function kindFromStatus(status: number): AppErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 400 || status === 422) return 'validation'
  return 'server'
}

/** API error bodies look like `{ code: string, message: string }`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  // `fetch` rejects with a TypeError when the network is unreachable
  if (error instanceof TypeError) return new AppError('network', error.message)
  return new AppError('server', error instanceof Error ? error.message : 'Unknown error')
}

/** Builds the error for a non-2xx API response. */
export async function errorFromResponse(res: Response): Promise<AppError> {
  const body: unknown = await res.json().catch(() => null)
  const message =
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
      ? body.message
      : res.statusText
  return new AppError(kindFromStatus(res.status), message, res.status)
}
