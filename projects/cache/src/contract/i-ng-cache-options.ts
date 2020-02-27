import { INgCacheStoreOptions } from './i-ng-cache-store-options';

export interface INgCacheOptions extends INgCacheStoreOptions {
  cacheMaxAge?: number;
  preloadMaxAge?: number;
}
