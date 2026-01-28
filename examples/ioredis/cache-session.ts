import { redis } from './redis';

export interface Session {
  id: string;
  data: Record<string, any>;
}

export async function cacheSession(session: Session) {
  await redis
    .pipeline()
    .set(session.id, JSON.stringify(session.data))
    .expire(session.id, 3600)
    .exec();
}
