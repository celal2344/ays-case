import { useAuthStore } from '@/features/auth/store'

import { fixtureUsers, toPublicUser } from './msw/handlers'

/** Puts the store in the "signed in" state without going through the login form. */
export function signInAs(username: 'emilys' | 'averyp') {
  const user = fixtureUsers[username]!
  useAuthStore.setState({
    accessToken: `access-${user.id}`,
    refreshToken: `refresh-${user.id}`,
    user: toPublicUser(user),
    status: 'authenticated',
  })
}
