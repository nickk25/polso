import { getRedis } from "./redis-client"

export async function cacheGet<T>(key: string): Promise<T | null> {
  return getRedis().get<T>(key)
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await getRedis().set(key, value, { ex: ttlSeconds })
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key)
}

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached
  const value = await fn()
  await cacheSet(key, value, ttlSeconds)
  return value
}
