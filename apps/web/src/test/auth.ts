import { useAuthStore } from '@/features/auth/store'

import { fixtureUsers, serverSession, toPublicUser } from './msw/handlers'

/** Puts the store and the mocked server in the "signed in" state without going through the form. */
export function signInAs(username: 'emilys' | 'averyp') {
  const user = fixtureUsers[username]!
  serverSession.userId = user.id
  useAuthStore.setState({ user: toPublicUser(user), status: 'authenticated' })
}
