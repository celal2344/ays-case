import { useAuthStore } from './store'

/** What route guards see on `context.auth`; a thin wrapper so tests can swap it. */
export const authContext = {
  bootstrap: () => useAuthStore.getState().bootstrap(),
  getState: () => useAuthStore.getState(),
}

export type AuthContext = typeof authContext

/** Where users land after login when there is no `?redirect=`. Becomes `/products` in G3. */
export const DEFAULT_LANDING = '/'
