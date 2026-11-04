import { API_BASE_URL } from '@ays/api-client'
import { createAuthClient } from 'better-auth/client'
import { adminClient, usernameClient } from 'better-auth/client/plugins'

/** Better Auth's browser client: cookie sessions on the same origin, sign-in by username. */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: `${API_BASE_URL}/auth`,
  plugins: [usernameClient(), adminClient()],
  // resolve `fetch` per call, so a test double installed later (MSW) is honoured
  fetchOptions: { customFetchImpl: (...args) => globalThis.fetch(...args) },
})
