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
export async function call<R extends { status: number; ok: boolean; json: () => Promise<unknown> }>(
  request: Promise<R>,
): Promise<OkBody<R>> {
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
  return (await res.json()) as OkBody<R>
}
