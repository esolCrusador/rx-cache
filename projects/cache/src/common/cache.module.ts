import { NgModule } from '@angular/core';
import { CacheService } from '../entity-cache/cache.service';
import { NgCacheService } from './ng-cache.service';

@NgModule({
  providers: [
    CacheService,
    NgCacheService,
  ]
})
export class CacheModule {
}
