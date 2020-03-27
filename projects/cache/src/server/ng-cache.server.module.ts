import { NgModule, ModuleWithProviders } from '@angular/core';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { CacheModule } from '../common/cache.module';
import { CacheConfiguration } from '../common/cache.configuration';
import { I_CACHE_LOGGER } from '../common/i-cache-logger';

// @dynamic
@NgModule({
  imports: [
    CacheModule,
  ],
  providers: [
    {
      provide: CacheConfiguration,
      useValue: new CacheConfiguration(CacheStoragesEnum.MEMORY),
    },
  ],
})
export class NgCacheServerModule {
  public static forRoot(loggerType: any): ModuleWithProviders {
    return {
      ngModule: NgCacheServerModule,
      providers: [{ provide: I_CACHE_LOGGER, useExisting: loggerType }]
    };
  }
}
