import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { admin, username } from 'better-auth/plugins'

import { getDb, type Database } from '../db/client'
import * as schema from '../db/schema'
import { env } from '../utils/env'
import { resolveOrigins } from './origin'

// Used only outside production and outside Vercel, so local dev and tests work without a secret.
const DEV_SECRET = 'development-only-secret-do-not-use-in-production'

export function createAuth(db: Database) {
  // any hosted deployment (production or preview) must have a real secret
  if ((env.NODE_ENV === 'production' || env.VERCEL_ENV) && !env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set')
  }
  const { baseURL, trustedOrigins } = resolveOrigins(env)
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET ?? DEV_SECRET,
    // The API is mounted under /api, and the service receives the original path.
    basePath: '/api/auth',
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    // Accounts are seeded or created by admins; nobody can sign themselves up.
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: {
      additionalFields: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
      },
    },
    // The session is answered from a signed cookie for 5 minutes, without a database call. Accepted
    // trade-off: a demoted or deleted user's old session data can stay valid for up to 5 minutes.
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    plugins: [username(), admin({ adminRoles: ['admin'] })],
  })
}

export type Auth = ReturnType<typeof createAuth>

let shared: Auth | undefined

export function getAuth(): Auth {
  shared ??= createAuth(getDb())
  return shared
}

/** Tests swap the database, so the cached instance has to be rebuilt. */
export function resetAuth() {
  shared = undefined
}
