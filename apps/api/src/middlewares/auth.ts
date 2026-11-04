import type { Role } from '@ays/validators'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import { getAuth, type Auth } from '../auth'
import { errorsFor } from '../utils/error-helpers'

const fail = errorsFor('auth', 'middleware')

export type SessionUser = Auth['$Infer']['Session']['user']
export type AuthEnv = { Variables: { user: SessionUser } }

async function authenticate(c: Context) {
  const session = await getAuth().api.getSession({ headers: c.req.raw.headers })
  if (!session) throw fail.unauthorized('authenticate', 'Sign in required')
  return session.user
}

/** Rejects requests without a valid session cookie; the user is then available as `c.var.user`. */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  c.set('user', await authenticate(c))
  await next()
})

/** Like `requireAuth`, and also rejects users whose role is not one of `roles`. */
export const requireRole = (...roles: Role[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = await authenticate(c)
    if (!roles.includes((user.role ?? 'user') as Role)) {
      throw fail.forbidden('requireRole', 'You do not have access to this resource', {
        userId: user.id,
        role: user.role,
        required: roles,
      })
    }
    c.set('user', user)
    await next()
  })
