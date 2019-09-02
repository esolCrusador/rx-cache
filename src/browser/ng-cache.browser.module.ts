import { NgModule } from '@angular/core';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { CacheModule } from '../common/cache.module';
import { CacheConfiguration } from '../common/cache.configuration';

@NgModule({
  imports: [
    CacheModule,
  ],
  providers: [
    {
      provide: CacheConfiguration,
      useValue: new CacheConfiguration(CacheStoragesEnum.LOCAL_STORAGE, CacheStoragesEnum.SESSION_STORAGE, CacheStoragesEnum.MEMORY),
    },
  ],
})
export class NgCacheBrowserModule {
}
