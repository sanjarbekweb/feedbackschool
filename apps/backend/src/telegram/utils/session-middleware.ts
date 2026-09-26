import { Context, MiddlewareFn } from 'grammy';
import { Prisma } from '@prisma/client';
import { UsersService } from '../../users/users.service';

// One backend replica: serialize updates per Telegram user, run different users concurrently.
// PostgreSQL persists only flow metadata, never message text.
interface SessionCacheEntry<T> {
  data: T;
  hash: string;
  updatedAt: number;
}

// In-memory cache across bot interactions
const memorySessionCache = new Map<string, SessionCacheEntry<unknown>>();

// Periodic cleanup of sessions inactive for > 2 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memorySessionCache.entries()) {
    if (now - entry.updatedAt > SESSION_TTL_MS) {
      memorySessionCache.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

export function persistentSession<T extends { state: string }>(
  namespace: string,
  sessions: Map<number, T>,
  users: UsersService,
): MiddlewareFn<Context> {
  const tails = new Map<number, Promise<void>>();

  return async (ctx, next) => {
    if (!ctx.from || ctx.chat?.type !== 'private') return;
    const id = ctx.from.id;
    const sessionKey = `${namespace}:${id}`;
    const previous = tails.get(id) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    tails.set(id, current);
    await previous;

    try {
      let cached = memorySessionCache.get(sessionKey) as SessionCacheEntry<T> | undefined;

      // If not in memory cache, load once from database
      if (!cached) {
        const stored = await users.loadBotSession(sessionKey);
        if (stored && typeof stored === 'object' && 'state' in stored) {
          cached = {
            data: stored as unknown as T,
            hash: JSON.stringify(stored),
            updatedAt: Date.now(),
          };
          memorySessionCache.set(sessionKey, cached as SessionCacheEntry<unknown>);
        }
      }

      if (cached) {
        sessions.set(id, cached.data);
      }

      const initialHash = cached?.hash || '';

      await next();

      // Dirty-check: only persist if data actually changed
      const currentData = sessions.get(id);
      if (currentData) {
        const currentHash = JSON.stringify(currentData);
        memorySessionCache.set(sessionKey, {
          data: currentData,
          hash: currentHash,
          updatedAt: Date.now(),
        });

        // If changed, save asynchronously (non-blocking) without holding up the user response
        if (currentHash !== initialHash) {
          void users
            .saveBotSession(sessionKey, currentData as unknown as Prisma.InputJsonValue)
            .catch(() => {});
        }
      }
    } finally {
      // Retain session in memory; do not delete!
      release();
      if (tails.get(id) === current) tails.delete(id);
    }
  };
}
