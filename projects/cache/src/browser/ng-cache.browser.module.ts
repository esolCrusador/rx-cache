import { NgModule, ModuleWithProviders } from '@angular/core';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { CacheModule } from '../common/cache.module';
import { CacheConfiguration } from '../common/cache.configuration';
import { I_CACHE_LOGGER } from '../common/i-cache-logger';

export function cacheConfigurationBrowserFactory() {
  return new CacheConfiguration(CacheStoragesEnum.HYBRID, CacheStoragesEnum.SESSION_STORAGE, CacheStoragesEnum.MEMORY);
}

// @dynamic
@NgModule({
  imports: [CacheModule]
})
export class NgCacheBrowserModule {
  public static forRoot(loggerType: any): ModuleWithProviders {
    return {
      ngModule: NgCacheBrowserModule,
      providers: [
        {
          provide: CacheConfiguration,
          useFactory: cacheConfigurationBrowserFactory
        },
        { provide: I_CACHE_LOGGER, useExisting: loggerType }],
    };
  }
}
