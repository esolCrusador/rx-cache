import * as moment from 'moment';
import { CacheHybridStorage } from './cache-hybrid-storage.service';
import { CacheMemoryStorage } from '../memory/cache-memory.service';
import { tick, fakeAsync } from '@angular/core/testing';

describe('CacheHybridStorage', () => {
  let cacheStorage: CacheHybridStorage;
  let persistentStorage: CacheMemoryStorage;
  const prefix = 'TESTPREFIX';

  beforeEach(() => {
    persistentStorage = new CacheMemoryStorage();
    persistentStorage.setItem(`${prefix}-test-default`, `test-default`);
    cacheStorage = new CacheHybridStorage(prefix, persistentStorage, 500);
  });

  describe('for', () => {
    it('should create hybrid cache storage', () => {
      expect(cacheStorage).toBeDefined();
      expect(cacheStorage instanceof CacheHybridStorage).toBeTruthy();
      expect(cacheStorage.getItem(`${prefix}-test-default`)).toEqual(`test-default`);
    });

    it('should write the items after 500 ms to the persistent storage', (done: DoneFn) => {
      cacheStorage.setItem(`${prefix}-test1`, 'test1');
      cacheStorage.setItem(`${prefix}-test2`, 'test2');
      cacheStorage.setItem(`${prefix}-test3`, 'test3');

      setTimeout(function() {
        expect(persistentStorage.getItem(`${prefix}-test1`)).toEqual('test1');
        expect(persistentStorage.getItem(`${prefix}-test2`)).toEqual('test2');
        expect(persistentStorage.getItem(`${prefix}-test3`)).toEqual('test3');

        done();
      }, 1000);
    });

    it('should delete the items after 500 ms from the persistent storage', (done: DoneFn) => {
      persistentStorage.setItem(`${prefix}-test1`, 'test1');
      persistentStorage.setItem(`${prefix}-test2`, 'test2');
      persistentStorage.setItem(`${prefix}-test3`, 'test3');

      cacheStorage.removeItem(`${prefix}-test1`);
      cacheStorage.removeItem(`${prefix}-test2`);

      setTimeout(function() {
        expect(persistentStorage.getItem(`${prefix}-test1`)).toBeNull();
        expect(persistentStorage.getItem(`${prefix}-test2`)).toBeNull();
        expect(persistentStorage.getItem(`${prefix}-test3`)).toEqual('test3');
        done();
      }, 1000);
    });
  });
});
