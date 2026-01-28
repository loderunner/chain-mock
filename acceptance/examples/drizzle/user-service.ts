import { users } from './schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

export function findUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id));
}
