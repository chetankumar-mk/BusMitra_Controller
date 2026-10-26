// Simple in-memory cache (module-level Map)
// Cleared only on page refresh or explicit clear() call
// Never uses localStorage - data is lost on page reload

const cache = new Map();

export const memoryCache = {
  get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    
    // Return null if expired (optional, not used in current implementation)
    if (entry.expiry && Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    
    return entry.value;
  },
  
  set(key, value, ttlMs = null) {
    const entry = { value };
    if (ttlMs) {
      entry.expiry = Date.now() + ttlMs;
    }
    cache.set(key, entry);
  },
  
  has(key) {
    return cache.has(key);
  },
  
  delete(key) {
    return cache.delete(key);
  },
  
  clear() {
    cache.clear();
  },
  
  size() {
    return cache.size;
  },
  
  keys() {
    return Array.from(cache.keys());
  },
};
