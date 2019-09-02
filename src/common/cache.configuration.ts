import { CacheStoragesEnum } from '../contract/cache-storages.enum';

export class CacheConfiguration extends Array<CacheStoragesEnum> {
  constructor(...cacheStorages: CacheStoragesEnum[]) {
    super(...cacheStorages);
  }
}
