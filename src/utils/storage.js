// Storage utility helpers for localStorage persistence

const STORAGE_PREFIX = 'heavyduty_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
};

// Generate unique IDs
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
