import { Injectable, Inject } from '@angular/core';
import { NgCacheService } from './ng-cache.service';
import { EntityCacheService } from './entity-cache.service';
import { IEntityCacheService } from './i-entity-cache.service';
import { ICacheOptions } from '../contract/i-cache.options';
import { ICacheService } from '../contract/i-cache.service';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly entityCaches: { [entityName: string]: IEntityCacheService<any> };

  constructor(
    @Inject(NgCacheService) private readonly ngCacheService: ICacheService
  ) {
    this.entityCaches = {};

    console.log('test 5');
  }

  public for<TEntity>(entityName: string, options: ICacheOptions): IEntityCacheService<TEntity> {
    let existingCache = this.entityCaches[entityName] as IEntityCacheService<TEntity>;
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
