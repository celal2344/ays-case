import { server } from './msw/server'

/**
 * Records `METHOD /path` for every request the app makes until the test ends (`setup.ts` removes the
 * listener). A product view is recorded too, so filter with `only` for the endpoint you mean.
 */
export function recordRequests() {
  const seen: string[] = []
  server.events.on('request:start', ({ request }) => {
    seen.push(`${request.method} ${new URL(request.url).pathname}`)
  })
  return seen
}

/** The requests that start with `prefix`, e.g. `'DELETE /api/cart'`. */
export const only = (requests: string[], prefix: string) =>
  requests.filter((r) => r.startsWith(prefix))

/** The toasts on screen. */
export const toasts = () => Array.from(document.querySelectorAll('[data-sonner-toast]'))
