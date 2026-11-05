import type { Role } from '@ays/validators'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import { getAuth, type Auth } from '../auth'
import { appError } from '../utils/errors'

export type SessionUser = Auth['$Infer']['Session']['user']
export type AuthEnv = { Variables: { user: SessionUser } }

const READ_ONLY = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * The session of the request. `live` skips Better Auth's 5-minute cookie cache and reads the
 * database, so a missing, expired or deleted session answers 401 right away.
 */
async function authenticate(c: Context, live: boolean) {
  const session = await getAuth().api.getSession({
    headers: c.req.raw.headers,
    ...(live ? { query: { disableCookieCache: true } } : {}),
  })
  if (!session) throw appError('unauthorized', 'Sign in required', 'auth.authenticate')
  return session.user
}

/**
 * Rejects requests without a valid session; the user is then available as `c.var.user`. Reads use
 * the cookie cache, anything that is not a read (a write) checks the live session.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  c.set('user', await authenticate(c, !READ_ONLY.has(c.req.method)))
  await next()
})

/** Like `requireAuth` but always checks the live session, for a read that must not be stale. */
export const requireFreshAuth = createMiddleware<AuthEnv>(async (c, next) => {
  c.set('user', await authenticate(c, true))
  await next()
})

/** Like `requireFreshAuth`, and also rejects users whose role is not one of `roles`. */
export const requireRole = (...roles: Role[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = await authenticate(c, true)
    if (!roles.includes((user.role ?? 'user') as Role)) {
      throw appError('forbidden', 'You do not have access to this resource', 'auth.requireRole', {
        userId: user.id,
        role: user.role,
        required: roles,
      })
    }
    c.set('user', user)
    await next()
  })
