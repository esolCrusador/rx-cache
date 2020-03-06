import * as moment from 'moment';
import { CacheHybridStorage } from '@cache/common/storage/hybrid-heap-storage/cache-hybrid-storage.service';
import { CacheMemoryStorage } from '@cache/common/storage/memory/cache-memory.service';
import { tick, fakeAsync } from '@angular/core/testing';

describe('CacheHybridStorage', () => {
  let cacheStorage: CacheHybridStorage;
  let persistentStorage: CacheMemoryStorage;
  const prefix = 'TESTPREFIX';

  function createStorage() {
    persistentStorage = new CacheMemoryStorage();
    persistentStorage.setItem(`${prefix}-test-default`, `test-default`);
    cacheStorage = new CacheHybridStorage(prefix, persistentStorage, 500);
  }

  describe('for', () => {
    it('should create hybrid cache storage', fakeAsync(() => {
      createStorage();

      expect(cacheStorage).toBeDefined();
      expect(cacheStorage instanceof CacheHybridStorage).toBeTruthy();
      expect(cacheStorage.getItem(`${prefix}-test-default`)).toEqual(`test-default`);

      cacheStorage.destroy();
    }));

    it('should write the items after 500 ms to the persistent storage', fakeAsync(() => {
      createStorage();

      cacheStorage.setItem(`${prefix}-test1`, 'test1');
      cacheStorage.setItem(`${prefix}-test2`, 'test2');
      cacheStorage.setItem(`${prefix}-test3`, 'test3');

      tick(1000);

      expect(persistentStorage.getItem(`${prefix}-test1`)).toEqual('test1');
      expect(persistentStorage.getItem(`${prefix}-test2`)).toEqual('test2');
      expect(persistentStorage.getItem(`${prefix}-test3`)).toEqual('test3');

      cacheStorage.destroy();
    }));

    it('should delete the items after 500 ms from the persistent storage', fakeAsync(() => {
      createStorage();

      persistentStorage.setItem(`${prefix}-test1`, 'test1');
      persistentStorage.setItem(`${prefix}-test2`, 'test2');
      persistentStorage.setItem(`${prefix}-test3`, 'test3');

      cacheStorage.removeItem(`${prefix}-test1`);
      cacheStorage.removeItem(`${prefix}-test2`);

      tick(1000);

      expect(persistentStorage.getItem(`${prefix}-test1`)).toBeNull();
      expect(persistentStorage.getItem(`${prefix}-test2`)).toBeNull();
      expect(persistentStorage.getItem(`${prefix}-test3`)).toEqual('test3');

      cacheStorage.destroy();
    }));
  });
});
