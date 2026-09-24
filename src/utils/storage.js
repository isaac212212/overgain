// Safe Storage utility helpers with Android WebView / LocalStorage fallback
const STORAGE_PREFIX = 'heavyduty_';
const memoryStore = {};

const isLocalStorageAvailable = () => {
  try {
    const testKey = '__og_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const hasLocalStorage = typeof window !== 'undefined' && 'localStorage' in window && isLocalStorageAvailable();

export const storage = {
  get(key, defaultValue = null) {
    try {
      if (hasLocalStorage) {
        const item = window.localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
      }
      return key in memoryStore ? memoryStore[key] : defaultValue;
    } catch (e) {
      console.warn('Safe storage get fallback for key:', key, e);
      return key in memoryStore ? memoryStore[key] : defaultValue;
    }
  },

  set(key, value) {
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      }
      memoryStore[key] = value;
    } catch (e) {
      console.warn('Safe storage set fallback for key:', key, e);
      memoryStore[key] = value;
    }
  },

  remove(key) {
    try {
      if (hasLocalStorage) {
        window.localStorage.removeItem(STORAGE_PREFIX + key);
      }
      delete memoryStore[key];
    } catch (e) {
      console.warn('Safe storage remove error:', e);
      delete memoryStore[key];
    }
  },

  clear() {
    try {
      if (hasLocalStorage) {
        Object.keys(window.localStorage)
          .filter(k => k.startsWith(STORAGE_PREFIX))
          .forEach(k => window.localStorage.removeItem(k));
      }
      Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
    } catch (e) {
      console.warn('Safe storage clear error:', e);
    }
  }
};

// Safe Unique ID Generator (works across all Android WebViews and browsers)
export function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}
