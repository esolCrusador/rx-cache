import { INgCacheStoreOptions } from './i-ng-cache-store-options';

export interface IStorageValue<TEntity> {

    /**
     * Cached data
     */
  value: TEntity;

    /**
     * Cached options
     */
  options: INgCacheStoreOptions;
}
