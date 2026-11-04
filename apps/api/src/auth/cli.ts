/**
 * Config for Better Auth's CLI only (`pnpm --filter @ays/api auth:generate`). It builds the same
 * options as the app against a database handle that is never queried.
 */
import { createDb } from '../db/client'
import { createAuth } from './index'

export const auth = createAuth(createDb('postgres://unused@localhost:5432/unused').db)
