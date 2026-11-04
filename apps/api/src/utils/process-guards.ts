import { logger } from './logger'

let installed = false

/**
 * Local dev only (`dev.ts`, never the Vercel entry, which has its own runtime). A database error
 * that nobody awaits (for example a pooled connection dropping) or a throw outside a request must
 * not take the dev server down: the request that caused it has already been answered. Log it at
 * fatal through the same logger and keep serving.
 */
export function installProcessGuards() {
  if (installed) return
  installed = true
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled rejection')
  })
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception')
  })
}
