import { IEntityCacheService } from '../common/i-entity-cache.service';

export type IAggregatedCacheMapping<TAggreatedModel> = { [property in keyof TAggreatedModel]: IEntityCacheService<TAggreatedModel[property]> };
