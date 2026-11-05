import { DrizzleQueryError } from 'drizzle-orm'
import pino from 'pino'

import { pgError } from './db-errors'
import { env } from './env'
import { AppError } from './errors'

type SerializedErr = { name: string; message: string; pgCode?: string; stack?: string }

/**
 * The `err` serializer: name, message, the Postgres code if any, and one short stack. It looks
 * through our wrapper and Drizzle's (whose message is the whole query), so SQL text and bound
 * parameters are never logged.
 */
export function serializeErr(error: unknown): SerializedErr {
  let target = error
  while (
    (target instanceof AppError || target instanceof DrizzleQueryError) &&
    target.cause !== undefined
  ) {
    target = target.cause
  }
  if (!(target instanceof Error)) return { name: 'NonError', message: String(target) }
  const message =
    target instanceof DrizzleQueryError || /^Failed query:/.test(target.message)
      ? 'Database query failed'
      : target.message
  const frames = (target.stack ?? '')
    .split('\n')
    .filter((line) => /^\s+at /.test(line) && !/node_modules|utils[\\/]errors/.test(line))
    .slice(0, 8)
  const pgCode = target instanceof AppError ? undefined : pgError(target)?.code
  return {
    name: target.name,
    message,
    ...(pgCode === undefined ? {} : { pgCode }),
    stack: [`${target.name}: ${message}`, ...frames].join('\n'),
  }
}

/** Plain JSON everywhere except local development, where `pino-pretty` prints readable blocks. */
export const loggerOptions: pino.LoggerOptions = {
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  base: undefined,
  serializers: { err: serializeErr },
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
}

export const logger = pino(loggerOptions)
