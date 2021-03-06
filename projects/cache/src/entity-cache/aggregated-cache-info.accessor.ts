import { ICacheInfoAccessor } from './i-cache-info.accessor';
import { ICacheValueInfo } from '../contract/i-cache-value-info';
import { INgCacheOptions } from '../contract/i-ng-cache-options';
import { IAggregatedCacheMapping } from './i-aggregated-cache.mapping';
import { IEntityCacheService } from '../common/i-entity-cache.service';

export class AggregatedCacheInfoAccessor<TAggregate> implements ICacheInfoAccessor<TAggregate> {
    constructor(
        private readonly mapping: IAggregatedCacheMapping<TAggregate>,
    ) {

    }
    public getCacheValueInfo(id: any, getKey: (id: any) => string, retrive: (entity: TAggregate) => TAggregate): ICacheValueInfo<TAggregate> {
        const result = {} as TAggregate;
        let validForCache: boolean = true;
        let validForPreload: boolean = true;

        const properties = Object.keys(this.mapping) as Array<keyof TAggregate>;

        for (const property of properties) {
            const cacheService: IEntityCacheService<any> = this.mapping[property];

            const cacheProperty = cacheService.getInfo(id);
            if (!cacheProperty) {
                return null;
            }

            result[property] = cacheProperty.value;
            validForCache = validForCache && cacheProperty.validForCache;
            validForPreload = validForPreload && cacheProperty.validForPreload;
        }

        return { value: retrive ? retrive(result) : result, validForCache: validForCache, validForPreload: validForPreload };
    }

    public set(id: any, getKey: (id: any) => string, value: TAggregate, options: INgCacheOptions): void {
        const aggregate = value as any as TAggregate;

        const properties = Object.keys(this.mapping) as Array<keyof TAggregate>;

        for (const property of properties) {
            const cacheService: IEntityCacheService<any> = this.mapping[property];
            cacheService.set(id, aggregate[property]);
        }
    }

    public remove(id: any, getKey: (id: any) => string): void {
        const properties = Object.keys(this.mapping) as Array<keyof TAggregate>;

        for (const property of properties) {
            const cacheService: IEntityCacheService<any> = this.mapping[property];
            cacheService.remove(id);
        }
    }
}
