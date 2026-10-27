// Safe wrapper around localStorage. Falls back to memory when storage is blocked (private windows etc.).
// Everything stays in the participant's browser — nothing here touches the network.

const fallback = new Map();

export const storage = {
  get(key, defaultValue = null) {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch { /* fall through */ }
    return fallback.has(key) ? fallback.get(key) : defaultValue;
  },
  set(key, value) {
    fallback.set(key, value);
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    fallback.delete(key);
    try { globalThis.localStorage?.removeItem(key); } catch { /* ignore */ }
  },
};
