import { logger } from './logger'

let installed = false

/**
 * A database error that is not awaited by anyone (for example the second of two queries when the
 * first already failed, or a pooled connection dropping) must not take the whole process down:
 * the request that caused it has already been answered with a 500. Log it and keep serving.
 */
export function installProcessGuards() {
  if (installed) return
  installed = true
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled rejection')
  })
}
