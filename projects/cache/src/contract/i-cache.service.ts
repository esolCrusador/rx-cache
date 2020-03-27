import { INgCacheOptions } from './i-ng-cache-options';
import { ICacheValueInfo } from './i-cache-value-info';

export interface ICacheService {
  set(key: string, value: any, options?: INgCacheOptions): boolean;
  getCacheValueInfo<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): ICacheValueInfo<TEntity>;
  getCache<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): TEntity;
  getPreload<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): TEntity;
  exists(key: string): boolean;
  remove(key: string);
  removeAll();
  getTagData(tag: string): {[key: string]: any};
  removeTag(tag: string);
  setGlobalPrefix(prefix: string);

  persist(): void;
  unpersist(): void;
}
