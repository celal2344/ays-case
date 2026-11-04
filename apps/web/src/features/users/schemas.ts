import { z } from 'zod'

import type { UserCreateBody, UserPatchBody } from '@ays/validators'

import { roleSchema, type Role, type User } from '@/features/auth/schemas'

export { roleSchema }
export type { Role, User }

export const USER_ERRORS = {
  username: 'admin.users.form.errors.username',
  firstName: 'admin.users.form.errors.firstName',
  lastName: 'admin.users.form.errors.lastName',
  email: 'admin.users.form.errors.email',
  role: 'admin.users.form.errors.role',
  usernameTaken: 'admin.users.form.errors.usernameTaken',
  password: 'admin.users.form.errors.password',
} as const

// Passwords are not managed here: accounts are provisioned on the server, and a password typed in
// an admin form could never be applied, so the form does not ask for one.
export const userFormSchema = z.object({
  username: z.string().trim().min(3, USER_ERRORS.username).max(30, USER_ERRORS.username),
  firstName: z.string().trim().min(1, USER_ERRORS.firstName).max(50, USER_ERRORS.firstName),
  lastName: z.string().trim().min(1, USER_ERRORS.lastName).max(50, USER_ERRORS.lastName),
  email: z
    .string()
    .trim()
    .refine((v) => z.email().safeParse(v).success, USER_ERRORS.email),
  role: roleSchema,
  password: z.string(),
})
/** The initial password is only asked for when creating. */
export const PASSWORD_LIMITS = { min: 8, max: 72 } as const
export const userCreateFormSchema = userFormSchema.extend({
  password: z
    .string()
    .min(PASSWORD_LIMITS.min, USER_ERRORS.password)
    .max(PASSWORD_LIMITS.max, USER_ERRORS.password),
})
export type UserFormValues = z.infer<typeof userFormSchema>

export const emptyUserForm: UserFormValues = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'user',
  password: '',
}

export function toUserFormValues(user: User): UserFormValues {
  return {
    username: user.username ?? '',
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    password: '',
  }
}

export function toUserInput(values: UserFormValues): UserCreateBody {
  return {
    username: values.username.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    role: values.role,
    password: values.password,
  }
}

export function toUserPatch(values: UserFormValues): UserPatchBody {
  return {
    username: values.username.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    role: values.role,
  }
}

export const USER_PAGE_SIZE = 20

/** URL state of the admin users table; `undefined` is the default (all roles, page 1). */
export const userSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  role: roleSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(2).optional().catch(undefined),
})
export type UserSearch = z.infer<typeof userSearchSchema>
