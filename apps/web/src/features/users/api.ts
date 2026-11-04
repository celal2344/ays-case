import type { UserCreateBody, UserPatchBody } from '@ays/validators'

import { api, call, callNoContent } from '@/lib/api'

import type { User } from './schemas'

/** All users in one request (admin only); search, filter and paging run client-side. */
export async function getUsers(): Promise<User[]> {
  const { data } = await call(api.users.$get())
  return data
}

export async function createUser(body: UserCreateBody) {
  const { data } = await call(api.users.$post({ json: body }), 201)
  return data
}

export async function updateUser(id: string, body: UserPatchBody) {
  const { data } = await call(api.users[':id'].$patch({ param: { id }, json: body }))
  return data
}

export async function deleteUser(id: string) {
  await callNoContent(api.users[':id'].$delete({ param: { id } }))
}
