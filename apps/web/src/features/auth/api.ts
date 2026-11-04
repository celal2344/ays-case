import { http } from '@/lib/http'

import { loginResponseSchema, userSchema } from './schemas'

export async function loginRequest(username: string, password: string) {
  const { data } = await http.post<unknown>('/auth/login', {
    username,
    password,
    expiresInMins: 60,
  })
  return loginResponseSchema.parse(data)
}

export async function getMe() {
  const { data } = await http.get<unknown>('/auth/me')
  return userSchema.parse(data)
}
