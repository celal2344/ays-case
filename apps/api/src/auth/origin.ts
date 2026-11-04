type OriginEnv = {
  BETTER_AUTH_URL?: string | undefined
  VERCEL_ENV?: string | undefined
  VERCEL_URL?: string | undefined
  VERCEL_BRANCH_URL?: string | undefined
  VERCEL_PROJECT_PRODUCTION_URL?: string | undefined
}

const LOCAL_ORIGIN = 'http://localhost:5173'

/**
 * The public origin of the app. Web and API share one origin (Vercel Services), so this is also
 * Better Auth's base URL. An explicit BETTER_AUTH_URL wins; otherwise it comes from Vercel's
 * system variables so preview deployments work, and local dev uses the Vite dev server origin.
 */
export function resolveOrigins(env: OriginEnv) {
  const fromVercel = (host: string | undefined) => (host ? `https://${host}` : undefined)
  const baseURL =
    env.BETTER_AUTH_URL ??
    (env.VERCEL_ENV === 'production'
      ? fromVercel(env.VERCEL_PROJECT_PRODUCTION_URL)
      : fromVercel(env.VERCEL_URL)) ??
    LOCAL_ORIGIN
  const trustedOrigins = [
    ...new Set(
      [
        baseURL,
        fromVercel(env.VERCEL_URL),
        // a preview opened through its branch alias sends that host as the Origin
        fromVercel(env.VERCEL_BRANCH_URL),
        fromVercel(env.VERCEL_PROJECT_PRODUCTION_URL),
      ].filter((origin): origin is string => Boolean(origin)),
    ),
  ]
  return { baseURL, trustedOrigins }
}
