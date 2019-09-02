import { NgModule } from '@angular/core';
import { CacheService } from './cache.service';
import { NgCacheService } from './ng-cache.service';

@NgModule({
  providers: [
    CacheService,
    NgCacheService,
  ]
})
export class CacheModule {
}
