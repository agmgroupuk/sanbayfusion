/**
 * In-memory storage shim — drop-in replacement for localStorage.
 * Data lives only in RAM; nothing touches disk or survives a page reload.
 * This eliminates all XSS-persistent data leakage vectors.
 */
const store = new Map<string, string>();

export const memoryStorage = {
  getItem(key: string): string | null {
    return store.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    store.set(key, value);
  },
  removeItem(key: string): void {
    store.delete(key);
  },
  clear(): void {
    store.clear();
  },
  get length(): number {
    return store.size;
  },
  key(index: number): string | null {
    return [...store.keys()][index] ?? null;
  },
};
