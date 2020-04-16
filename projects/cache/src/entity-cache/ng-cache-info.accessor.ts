import { ICacheInfoAccessor } from './i-cache-info.accessor';
import { INgCacheOptions } from '../contract/i-ng-cache-options';
import { ICacheValueInfo } from '../contract/i-cache-value-info';
import { ICacheService } from '../contract/i-cache.service';

export class NgCacheInfoAccessor<TEntity> implements ICacheInfoAccessor<TEntity> {
    constructor(
        private readonly ngCacheService: ICacheService,
    ) {
    }

    public getCacheValueInfo(id: any, getKey: (id: any) => string, retrive: (entity: TEntity) => TEntity): ICacheValueInfo<TEntity> {
        return this.ngCacheService.getCacheValueInfo(getKey(id), retrive);
    }

    public set(id: any, getKey: (id: any) => string, value: TEntity, options: INgCacheOptions): void {
        this.ngCacheService.set(getKey(id), value, options);
    }

    public remove(id: any, getKey: (id: any) => string): void {
        this.ngCacheService.remove(getKey(id));
    }

}
