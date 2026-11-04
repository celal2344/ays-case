// Real DummyJSON accounts (GET /users/filter?key=role&value=...), so "Fill" buttons need no passwords from the user.
export const DEMO_ACCOUNTS = {
  admin: { username: 'emilys', password: 'emilyspass' },
  user: { username: 'averyp', password: 'averyppass' },
} as const
