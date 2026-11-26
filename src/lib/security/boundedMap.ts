/**
 * Inserts or refreshes an entry inside a size-bounded `Map` using LRU/insertion order eviction.
 * Prevents unbounded memory growth across long-running serverless or Node instances.
 */
export function setBoundedMapEntry<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxEntries: number = 500
): void {
  if (map.has(key)) {
    map.delete(key);
  }
  while (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
  map.set(key, value);
}

/**
 * Evicts expired records from a cache or rate-limit `Map` prior to inserting new keys.
 */
export function pruneExpiredMapEntries<K, V>(
  map: Map<K, V>,
  isExpired: (value: V) => boolean
): void {
  for (const [key, value] of map.entries()) {
    if (isExpired(value)) {
      map.delete(key);
    }
  }
}
