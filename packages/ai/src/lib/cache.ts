/**
 * Memoización en memoria por hash de (modelo + prompt + esquema), dentro del
 * proceso (REQ-LC-02). No persiste entre reinicios.
 */
export class InMemoryCache<T> {
  private readonly store = new Map<string, Promise<T>>();

  key(parts: Record<string, unknown>): string {
    return JSON.stringify(parts, Object.keys(parts).sort());
  }

  async getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = this.store.get(key);
    if (cached) return cached;

    const promise = compute().catch((err) => {
      this.store.delete(key);
      throw err;
    });
    this.store.set(key, promise);
    return promise;
  }
}
