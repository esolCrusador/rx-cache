import { Injectable } from '@angular/core';
import { EntityCacheService } from './entity-cache.service';
import { IEntityCacheService } from '../common/i-entity-cache.service';
import { ICacheOptions } from '../contract/i-cache.options';
import { ICacheService } from '../contract/i-cache.service';
import { NgCacheInfoAccessor } from './ng-cache-info.accessor';
import { IAggregatedCacheMapping } from './i-aggregated-cache.mapping';
import { AggregatedCacheInfoAccessor } from './aggregated-cache-info.accessor';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly defaultCacheInfoAccessor: NgCacheInfoAccessor;
  private readonly entityCaches: { [entityName: string]: IEntityCacheService<any> };
  private readonly aggregatedCaches: { [aggregateName: string]: IEntityCacheService<any> };

  constructor(
    private readonly ngCacheService: ICacheService
  ) {
    this.defaultCacheInfoAccessor = new NgCacheInfoAccessor(ngCacheService);
    this.entityCaches = {};
    this.aggregatedCaches = {};
  }

  public for<TEntity>(entityName: string, options: ICacheOptions): IEntityCacheService<TEntity> {
    let existingCache = this.entityCaches[entityName] as IEntityCacheService<TEntity>;
    if (existingCache) {
      if (!existingCache.areOptionsSame(options)) {
        throw new Error(`The otpions for entity cache ${entityName} were changed`);
      }
    } else {
      existingCache = this.entityCaches[entityName] = new EntityCacheService<TEntity>(this.defaultCacheInfoAccessor, entityName, options);
    }

    return existingCache;
  }

  public aggregated<TAggregate>(aggregateName: string, cacheMapping: IAggregatedCacheMapping<TAggregate>): IEntityCacheService<TAggregate> {
    let existingCache = this.aggregatedCaches[aggregateName] as IEntityCacheService<TAggregate>;

    if (!existingCache) {
      existingCache = this.aggregatedCaches[aggregateName] = new EntityCacheService<TAggregate>(new AggregatedCacheInfoAccessor(cacheMapping), aggregateName);
    }

    return existingCache;
  }

  public persist(): void {
    this.ngCacheService.persist();
  }

  public unPersist(): void {
    this.ngCacheService.unpersist();
  }
}
