/**
 * Safe local storage wrapper that functions safely in browser, SSR, or Node.js test environments.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },

  setItem(key: string, value: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignored in restricted environments
      }
    }
  },

  removeItem(key: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignored
      }
    }
  },
};

