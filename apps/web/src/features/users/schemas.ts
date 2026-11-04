import { z } from 'zod'

import { roleSchema, userSchema, type Role, type User } from '@/features/auth/schemas'

// The user shape is the one `/auth/me` returns (derived by hand from dummyjson.json: User, UserList).
export { roleSchema, userSchema }
export type { Role, User }

export const userListResponseSchema = z.object({ users: z.array(userSchema) })

export const USER_ERRORS = {
  username: 'admin.users.form.errors.username',
  firstName: 'admin.users.form.errors.firstName',
  lastName: 'admin.users.form.errors.lastName',
  email: 'admin.users.form.errors.email',
  role: 'admin.users.form.errors.role',
  usernameTaken: 'admin.users.form.errors.usernameTaken',
} as const

// Passwords are not managed here: sign-in always goes through DummyJSON's own accounts, and a
// password typed in an admin form could never be checked, so the form does not ask for one.
export const userFormSchema = z.object({
  username: z.string().trim().min(3, USER_ERRORS.username).max(30, USER_ERRORS.username),
  firstName: z.string().trim().min(1, USER_ERRORS.firstName).max(50, USER_ERRORS.firstName),
  lastName: z.string().trim().min(1, USER_ERRORS.lastName).max(50, USER_ERRORS.lastName),
  email: z
    .string()
    .trim()
    .refine((v) => z.email().safeParse(v).success, USER_ERRORS.email),
  role: roleSchema,
})
export type UserFormValues = z.infer<typeof userFormSchema>

export const emptyUserForm: UserFormValues = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'user',
}

export function toUserFormValues(user: User): UserFormValues {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  }
}

export function toUserInput(values: UserFormValues): Omit<User, 'id'> {
  return {
    username: values.username.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    role: values.role,
    image: '',
  }
}

export function toUserPatch(values: UserFormValues): Partial<Omit<User, 'id'>> {
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
