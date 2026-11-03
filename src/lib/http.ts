import axios, { type InternalAxiosRequestConfig } from 'axios'

import { tokensSchema } from '@/features/auth/schemas'
import { useAuthStore } from '@/features/auth/store'

import { env } from './env'
import { toAppError } from './http-error'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retried?: boolean
  }
}

const config = { baseURL: env.VITE_API_BASE_URL, timeout: 15_000 }

/** Interceptor-free client, used only for the refresh call so it can never recurse. */
const bare = axios.create(config)

export const http = axios.create(config)

http.interceptors.request.use((request) => {
  const token = useAuthStore.getState().accessToken
  if (token) request.headers.Authorization = `Bearer ${token}`
  return request
})

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState()
  if (!refreshToken) return null
  try {
    const { data } = await bare.post<unknown>('/auth/refresh', { refreshToken, expiresInMins: 60 })
    const tokens = tokensSchema.parse(data)
    setTokens(tokens)
    return tokens.accessToken
  } catch {
    return null
  }
}

let refreshing: Promise<string | null> | null = null

http.interceptors.response.use(undefined, async (error: unknown) => {
  const original = axios.isAxiosError(error)
    ? (error.config as InternalAxiosRequestConfig | undefined)
    : undefined
  // /auth/me must be refreshable; only login and refresh themselves are excluded (no loops)
  const isAuthCall = /\/auth\/(login|refresh)/.test(original?.url ?? '')
  if (
    !axios.isAxiosError(error) ||
    error.response?.status !== 401 ||
    !original ||
    original._retried ||
    isAuthCall
  ) {
    throw toAppError(error)
  }

  original._retried = true
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null
  })
  const token = await refreshing
  if (!token) {
    useAuthStore.getState().logout()
    throw toAppError(error)
  }
  original.headers.Authorization = `Bearer ${token}`
  return http(original)
})
