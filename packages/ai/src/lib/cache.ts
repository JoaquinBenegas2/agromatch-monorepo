function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeysDeep(source[k]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Memoización en memoria por hash de (modelo + prompt + esquema), dentro del
 * proceso (REQ-LC-02). No persiste entre reinicios.
 */
export class InMemoryCache<T> {
  private readonly store = new Map<string, Promise<T>>();

  /**
   * Clave estable: ordena las claves en todos los niveles. Un replacer con
   * la lista de claves de primer nivel (versión anterior) descartaba las
   * anidadas (`bull.naab`, `schema.properties`...) y hacía colisionar
   * entradas distintas.
   */
  key(parts: Record<string, unknown>): string {
    return JSON.stringify(sortKeysDeep(parts));
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
