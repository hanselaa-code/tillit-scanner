interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: number;
}

export class CacheService {
  private static entityCache = new Map<string, CacheEntry<any>>();
  private static evidenceCache = new Map<string, CacheEntry<any>>();
  private static reportCache = new Map<string, CacheEntry<any>>();

  // Standard TTL (Time To Live)
  public static readonly TTL_ENTITY_MS = 24 * 60 * 60 * 1000;    // 24 timer
  public static readonly TTL_EVIDENCE_MS = 12 * 60 * 60 * 1000;  // 12 timer
  public static readonly TTL_REPORT_MS = 45 * 60 * 1000;         // 45 minutter

  public static getEntity<T>(key: string): { data: T; cachedAt: string } | undefined {
    return this.get<T>(this.entityCache, key.toLowerCase());
  }

  public static setEntity<T>(key: string, data: T, ttlMs: number = this.TTL_ENTITY_MS): void {
    this.set<T>(this.entityCache, key.toLowerCase(), data, ttlMs);
  }

  public static getEvidence<T>(key: string): { data: T; cachedAt: string } | undefined {
    return this.get<T>(this.evidenceCache, key.toLowerCase());
  }

  public static setEvidence<T>(key: string, data: T, ttlMs: number = this.TTL_EVIDENCE_MS): void {
    this.set<T>(this.evidenceCache, key.toLowerCase(), data, ttlMs);
  }

  public static getReport<T>(subjectKey: string, scanType: string): { data: T; cachedAt: string } | undefined {
    const key = `${subjectKey.toLowerCase()}::${scanType}`;
    return this.get<T>(this.reportCache, key);
  }

  public static setReport<T>(
    subjectKey: string,
    scanType: string,
    data: T,
    ttlMs: number = this.TTL_REPORT_MS
  ): void {
    const key = `${subjectKey.toLowerCase()}::${scanType}`;
    this.set<T>(this.reportCache, key, data, ttlMs);
  }

  private static get<T>(map: Map<string, CacheEntry<any>>, key: string): { data: T; cachedAt: string } | undefined {
    const entry = map.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      map.delete(key);
      return undefined;
    }

    return {
      data: entry.data as T,
      cachedAt: entry.cachedAt,
    };
  }

  private static set<T>(
    map: Map<string, CacheEntry<any>>,
    key: string,
    data: T,
    ttlMs: number
  ): void {
    const now = new Date();
    map.set(key, {
      data,
      cachedAt: now.toISOString(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  public static clearAll(): void {
    this.entityCache.clear();
    this.evidenceCache.clear();
    this.reportCache.clear();
  }
}
