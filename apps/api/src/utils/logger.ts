import pino from 'pino'

import { env } from './env'
import { serializeErr } from './error-log'

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
