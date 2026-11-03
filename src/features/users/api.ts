import { z } from 'zod'

import { http } from '@/lib/http'

import { userListResponseSchema, type User } from './schemas'

const LIST_FIELDS = 'id,username,firstName,lastName,email,role,image'

/** All ~200 users in one request; search, filter and paging run client-side (like the catalog). */
export async function getUsers(): Promise<User[]> {
  const { data } = await http.get<unknown>('/users', { params: { limit: 0, select: LIST_FIELDS } })
  return userListResponseSchema.parse(data).users
}

// DummyJSON accepts these writes but persists nothing, and it ignores `role` (docs/api.md). The
// responses only prove the request was well formed; the app keeps the result in the user overlay.
const writeEchoSchema = z.object({ id: z.number() }).passthrough()
const deleteEchoSchema = z.object({ id: z.number(), isDeleted: z.boolean() }).passthrough()

export type UserWriteBody = Partial<
  Pick<User, 'username' | 'firstName' | 'lastName' | 'email' | 'role'>
>

export async function createUser(body: UserWriteBody) {
  const { data } = await http.post<unknown>('/users/add', body)
  return writeEchoSchema.parse(data)
}

export async function updateUser(id: number, body: UserWriteBody) {
  const { data } = await http.put<unknown>(`/users/${id}`, body)
  return writeEchoSchema.parse(data)
}

export async function deleteUser(id: number) {
  const { data } = await http.delete<unknown>(`/users/${id}`)
  return deleteEchoSchema.parse(data)
}
