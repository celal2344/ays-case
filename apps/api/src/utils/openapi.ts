import { errorSchema } from '@ays/validators'
import { resolver } from 'hono-openapi'

export const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: resolver(errorSchema) } },
})

const standard: Record<number, string> = {
  400: 'Malformed request',
  401: 'Not signed in',
  403: 'Signed in, but not allowed',
  404: 'Not found',
  409: 'Conflict with the current state',
  422: 'Invalid body, query or parameters',
  500: 'Unexpected server error',
  503: '`database_unavailable`: try again',
}

/**
 * The standard error responses for `describeRoute`, plus 500 and 503 that every database-backed
 * route can answer: `responses: { 200: ..., ...errorResponses(404, 401, 403) }`.
 */
export function errorResponses(...statuses: number[]) {
  return Object.fromEntries(
    [...new Set([...statuses, 500, 503])]
      .sort((a, b) => a - b)
      .map((status) => [status, errorResponse(standard[status] ?? 'Error')]),
  )
}

export const openApiDocumentation = {
  openapi: '3.1.0' as const,
  info: {
    title: 'ays-case API',
    version: '0.0.0',
    description: 'REST API for the ays-case shop. Successful bodies are wrapped in `{ data }`.',
  },
  servers: [{ url: '/api' }],
}
