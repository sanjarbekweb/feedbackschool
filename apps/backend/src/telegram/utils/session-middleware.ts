import { Context, MiddlewareFn } from 'grammy';
import { Prisma } from '@prisma/client';
import { UsersService } from '../../users/users.service';

// One backend replica: serialize updates per Telegram user, run different users concurrently.
// PostgreSQL persists only flow metadata, never message text.
export function persistentSession<T extends { state: string }>(
  namespace: string, sessions: Map<number, T>, users: UsersService,
): MiddlewareFn<Context> {
  const tails = new Map<number, Promise<void>>();
  return async (ctx, next) => {
    if (!ctx.from || ctx.chat?.type !== 'private') return;
    const id = ctx.from.id;
    const previous = tails.get(id) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => { release = resolve; });
    tails.set(id, current);
    await previous;
    try {
      const stored = await users.loadBotSession(`${namespace}:${id}`);
      if (stored && typeof stored === 'object' && 'state' in stored) sessions.set(id, stored as unknown as T);
      await next();
      const data = sessions.get(id);
      if (data) await users.saveBotSession(`${namespace}:${id}`, data as unknown as Prisma.InputJsonValue);
    } finally {
      sessions.delete(id);
      release();
      if (tails.get(id) === current) tails.delete(id);
    }
  };
}
