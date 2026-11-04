type PgError = { code?: string; constraint_name?: string; constraint?: string; detail?: string }

/** Drizzle wraps the driver error as `cause`; postgres-js and PGlite name the constraint differently. */
function pgError(error: unknown): PgError | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
    const candidate = current as PgError & { cause?: unknown }
    if (typeof candidate.code === 'string') return candidate
    current = candidate.cause
  }
  return undefined
}

export type DbConflict =
  | { kind: 'duplicate'; constraint: string | undefined }
  | { kind: 'in_use' }
  | { kind: 'missing_reference' }

/** Turns the three constraint failures an admin write can hit into something a route can answer. */
export function toConflict(error: unknown): DbConflict | undefined {
  const pg = pgError(error)
  if (!pg) return undefined
  if (pg.code === '23505')
    return { kind: 'duplicate', constraint: pg.constraint_name ?? pg.constraint }
  // 23503: deleting a row that is still referenced, or pointing at a row that does not exist
  if (pg.code === '23503') {
    return /is still referenced/i.test(pg.detail ?? '')
      ? { kind: 'in_use' }
      : { kind: 'missing_reference' }
  }
  return undefined
}

/** `products_sku_unique` → `sku`, `users_username_unique` → `username`; falls back to the constraint. */
export function duplicateField(constraint: string | undefined) {
  const match = constraint?.match(/(sku|barcode|slug|username|email|name|label)/)
  return match?.[1] ?? 'value'
}
