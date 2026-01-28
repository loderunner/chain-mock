import { users } from './schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

export async function findUserById(id: number) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user[0];
}
