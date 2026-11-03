import { z } from 'zod'

// Derived by hand from dummyjson.json: AuthUser, LoginResponse, Tokens, User.
// The spec has no `required` lists or enums, so the fields the app depends on are made required here.

export const roleSchema = z.enum(['admin', 'moderator', 'user'])
export type Role = z.infer<typeof roleSchema>

export const tokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})
export type Tokens = z.infer<typeof tokensSchema>

/** `POST /auth/login`: tokens plus the basic user fields, but no role. */
export const loginResponseSchema = tokensSchema.extend({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string(),
})

/** `GET /auth/me`: the full user, including `role`. */
export const userSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string(),
  role: roleSchema,
})
export type User = z.infer<typeof userSchema>

export const loginFormSchema = z.object({
  username: z.string().trim().min(1, 'required'),
  password: z.string().min(1, 'required'),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>
