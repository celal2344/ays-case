import { API_BASE_URL, hcWithType } from '@ays/api-client'

import { useAuthStore } from '@/features/auth/store'

import { errorFromResponse, toAppError } from './http-error'

/** The typed Hono RPC client. Same origin as the app, so the session cookie rides along. */
export const api = hcWithType(API_BASE_URL)

type OkBody<R> = Extract<R, { status: 200 }> extends { json: () => Promise<infer B> } ? B : never

/**
 * Runs an RPC call and returns the typed body of its 200 answer. Transport failures and non-2xx
 * answers become `AppError`, so callers and `queryOptions` deal with one error type.
 */
type Settled = { status: number; ok: boolean }

/** Sends the request; failures and non-2xx answers become `AppError`. Returns the raw response. */
async function send<R extends Settled>(request: Promise<R>): Promise<R> {
  let res: R
  try {
    res = await request
  } catch (error) {
    throw toAppError(error)
  }
  if (!res.ok) {
    // a rejected session while signed in ends it; public calls never carry one
    if (res.status === 401) useAuthStore.getState().expire()
    throw await errorFromResponse(res as unknown as Response)
  }
  return res
}

/**
 * Runs an RPC call and returns the typed body of its 200 answer. Transport failures and non-2xx
 * answers become `AppError`, so callers and `queryOptions` deal with one error type.
 */
export async function call<R extends Settled & { json: () => Promise<unknown> }>(
  request: Promise<R>,
): Promise<OkBody<R>> {
  const res = await send(request)
  return (await res.json()) as OkBody<R>
}

/** Like `call`, for answers without a body (204). */
export async function callNoContent(request: Promise<Settled>): Promise<void> {
  await send(request)
}
