// Tiny in-memory TTL cache. Stores in-flight promises (not resolved values)
// so concurrent callers for the same key share one request instead of firing
// duplicates, and failures aren't cached — a transient upstream error won't
// get stuck for the full TTL.
type CacheEntry<T> = { promise: Promise<T>; expiresAt: number };

export function createCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.promise;

      const promise = load().catch((err) => {
        store.delete(key);
        throw err;
      });
      store.set(key, { promise, expiresAt: Date.now() + ttlMs });
      return promise;
    },
  };
}
