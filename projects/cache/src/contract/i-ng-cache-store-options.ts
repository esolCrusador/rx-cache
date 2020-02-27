export interface INgCacheStoreOptions {
  /**
   * Cache Expires timestamp
   */
  cacheExpires?: number;

  /**
   * Preload Expires timestamp
   */
  preloadExpires?: number;

  /**
   * Tag for this key
   */
  tag?: string;
}
