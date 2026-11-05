import { asc, eq, sql } from 'drizzle-orm'

import type { Database } from '../../../db/client'
import { session, user } from '../../../db/schema'

const columns = {
  id: user.id,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  image: user.image,
}

export function listUsers(db: Database) {
  return db.select(columns).from(user).orderBy(asc(user.createdAt), asc(user.id))
}

export async function findUser(db: Database, id: string) {
  const [row] = await db.select(columns).from(user).where(eq(user.id, id))
  return row
}

export async function countAdmins(db: Database) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, 'admin'))
  return row!.n
}

export async function setRole(db: Database, id: string, role: string) {
  await db.update(user).set({ role }).where(eq(user.id, id))
}

export async function updateUser(db: Database, id: string, set: Record<string, string>) {
  await db
    .update(user)
    .set({ ...set, updatedAt: sql`now()` })
    .where(eq(user.id, id))
}

export async function deleteSessions(db: Database, userId: string) {
  await db.delete(session).where(eq(session.userId, userId))
}

export async function deleteUser(db: Database, id: string) {
  await db.delete(user).where(eq(user.id, id))
}
