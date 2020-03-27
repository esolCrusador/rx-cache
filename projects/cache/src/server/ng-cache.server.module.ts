import { NgModule, ModuleWithProviders } from '@angular/core';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { CacheModule } from '../common/cache.module';
import { CacheConfiguration } from '../common/cache.configuration';
import { I_CACHE_LOGGER } from '../common/i-cache-logger';

export function cacheConfigurationServerFactory() {
  return new CacheConfiguration(CacheStoragesEnum.MEMORY);
}

// @dynamic
@NgModule({
  imports: [
    CacheModule,
  ]
})
export class NgCacheServerModule {
  public static forRoot(loggerType: any): ModuleWithProviders {
    return {
      ngModule: NgCacheServerModule,
      providers: [
        {
          provide: CacheConfiguration,
          useFactory: cacheConfigurationServerFactory,
        },
        { provide: I_CACHE_LOGGER, useExisting: loggerType }
      ]
    };
  }
}
