import { userSchema as apiUserSchema, roleSchema, type Role, type User } from '@ays/validators'
import { z } from 'zod'

export { roleSchema }
export type { Role, User }

/** The signed-in user as the session reports it (extra session fields are dropped). */
export const sessionUserSchema = apiUserSchema

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, 'required'),
  password: z.string().min(1, 'required'),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>
