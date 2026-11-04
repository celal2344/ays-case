import { errorSchema } from '@ays/validators'
import { resolver } from 'hono-openapi'

export const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: resolver(errorSchema) } },
})

export const openApiDocumentation = {
  openapi: '3.1.0' as const,
  info: {
    title: 'ays-case API',
    version: '0.0.0',
    description: 'REST API for the ays-case shop. Successful bodies are wrapped in `{ data }`.',
  },
}
