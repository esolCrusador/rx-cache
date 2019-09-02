import { Injectable, Inject } from '@angular/core';
import { NgCacheService } from './ng-cache.service';
import { EntityCacheService } from './entity-cache.service';
import { IEntityCacheService } from './i-entity-cache.service';
import { ICacheOptions } from '../contract/i-cache.options';
import { ICacheService } from '../contract/i-cache.service';
import { IMap } from '@nimbus-library/features/shared/models/i-map';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly entityCaches: IMap<object>;

  constructor(
    @Inject(NgCacheService) private readonly ngCacheService: ICacheService
  ) {
    this.entityCaches = {};
  }

  public for<TEntity>(entityName: string, options: ICacheOptions): IEntityCacheService<TEntity> {
    let existingCache = this.entityCaches[entityName] as EntityCacheService<TEntity>;
    if (existingCache) {
      if (!existingCache.areOptionsSame(options)) {
        throw new Error(`The otpions for entity cache ${entityName} were changed`);
      }
    } else {
      existingCache = this.entityCaches[entityName] = new EntityCacheService<TEntity>(this.ngCacheService, entityName, options);
    }

    return existingCache;
  }
}
