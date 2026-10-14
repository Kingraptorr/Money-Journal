export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, list] of hits) {
      const recent = list.filter((time) => now - time < windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    }
  }, 5 * 60 * 1000);
  timer.unref();

  return {
    check(key) {
      const now = Date.now();
      const list = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (list.length >= max) {
        hits.set(key, list);
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) };
      }
      list.push(now);
      hits.set(key, list);
      return { allowed: true, retryAfterSec: 0 };
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
