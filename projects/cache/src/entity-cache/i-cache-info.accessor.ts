import { ICacheValueInfo } from '../contract/i-cache-value-info';
import { INgCacheOptions } from '../contract/i-ng-cache-options';

export interface ICacheInfoAccessor {
    getCacheValueInfo<TEntity>(id: any, getKey: (id: any) => string, retrive: (entity: TEntity) => TEntity): ICacheValueInfo<TEntity>;
    set<TEntity>(id: any, getKey: (id: any) => string, value: TEntity, options: INgCacheOptions): void;
    remove(id: any, getKey: (id: any) => string): void;
}
