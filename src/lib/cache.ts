import { redis } from "../config/redis.js";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);

  if (!value) {
    return null;
  }

  return JSON.parse(value) as T;
}

export async function cacheSet(key: string, value: unknown, ttl = 60) {
  await redis.set(key, JSON.stringify(value), {
    EX: ttl,
  });
}

export async function cacheDelete(key: string) {
  await redis.del(key);
}
