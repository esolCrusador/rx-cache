import { NgCacheService } from './ng-cache.service';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { ILogger } from '../../logger/i-logger';
import * as moment from 'moment';
import { CacheMemoryStorage } from './storage/memory/cache-memory.service';

describe('NgCacheService', () => {
  let ngCacheService: NgCacheService;
  let logger: jasmine.SpyObj<ILogger>;

  beforeEach(() => {
    logger = jasmine.createSpyObj<ILogger>('Logger', ['error']);

    ngCacheService = new NgCacheService([CacheStoragesEnum.MEMORY], 'Browser', logger);
  });

  describe('constructor', () => {
    it('should fail if no logger types were specified', (done: DoneFn) => {
      try {
        ngCacheService = new NgCacheService(null, 'server', logger);
        expect(ngCacheService).not.toBeDefined();
        done.fail();
      } catch (error) {
        expect(error).toBeDefined();
        done();
      }
    });

    it('should fail if empty logger types were specified', (done: DoneFn) => {
      try {
        ngCacheService = new NgCacheService([], 'server', logger);
        expect(ngCacheService).not.toBeDefined();
        done.fail();
      } catch (error) {
        expect(error).toBeDefined();
        done();
      }
    });

    it('should log error if server platform has Local Storage logging type', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.LOCAL_STORAGE], 'server', logger);

      expect(ngCacheService).toBeDefined();
      expect(ngCacheService.getStorageType()).toBe(CacheStoragesEnum.LOCAL_STORAGE);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('should log error if server platform has Session Storage logging type', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.SESSION_STORAGE], 'server', logger);

      expect(ngCacheService).toBeDefined();
      expect(ngCacheService.getStorageType()).toBe(CacheStoragesEnum.SESSION_STORAGE);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('should work correctly if server platform has Memory Storage logging type', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.MEMORY], 'server', logger);

      expect(ngCacheService).toBeDefined();
      expect(ngCacheService.getStorageType()).toBe(CacheStoragesEnum.MEMORY);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });

    it('should log error if browser platform has Memory Storage logging type', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.MEMORY, CacheStoragesEnum.LOCAL_STORAGE], 'browser', logger);

      expect(ngCacheService).toBeDefined();
      expect(ngCacheService.getStorageType()).toBe(CacheStoragesEnum.MEMORY);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('should work correctly if browser platform has Session Storage logging type', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.LOCAL_STORAGE], 'browser', logger);

      expect(ngCacheService).toBeDefined();
      expect(ngCacheService.getStorageType()).toBe(CacheStoragesEnum.LOCAL_STORAGE);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });

    it('should work correctly if browser platform has Local Storage logging type', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.SESSION_STORAGE], 'browser', logger);

      expect(ngCacheService).toBeDefined();
      expect(ngCacheService.getStorageType()).toBe(CacheStoragesEnum.SESSION_STORAGE);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
  });

  describe('get/set', () => {
    beforeEach(() => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.MEMORY], 'browser', logger);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should get not setted value as undefined', () => {
      expect(ngCacheService.getCache('111')).toBe(undefined);
    });

    for (const result of [35, null, -1, NaN]) {
      it(`should get setted value '${result}'`, () => {
        expect(ngCacheService.getCache('111')).toBe(undefined);
        ngCacheService.set('111', result);
        expect(ngCacheService.getPreload('111')).toEqual(result);
      });
    }

    it('should remove expired value', () => {
      ngCacheService.set('222', 222, { cacheMaxAge: -1 });
      expect(ngCacheService.getCache('222')).toBe(undefined);

      const expiration = moment();
      expiration.subtract(1, 'second');

      ngCacheService.set('222', 333, { cacheMaxAge: -1 });
      expect(ngCacheService.getCache('222')).toBe(undefined);
    });

    it('should retrive value', () => {
      expect(ngCacheService.getPreload('111')).toBe(undefined);
      ngCacheService.set('111', 111);
      expect(ngCacheService.getPreload<number>('111', value => value + 1)).toEqual(112);
    });
  });

  describe('exists/remove/removeAll', () => {
    for (const result of [35, null, -1, NaN]) {
      it(`should return true for existing value '${result}'`, () => {
        expect(ngCacheService.getCache('111')).toBe(undefined);
        ngCacheService.set('111', result);
        expect(ngCacheService.exists('111')).toBe(true);
        ngCacheService.remove('111');
        expect(ngCacheService.exists('111')).toBe(false);
        ngCacheService.set('111', result);
        ngCacheService.removeAll();
        expect(ngCacheService.exists('111')).toBe(false);
      });
    }

    it('should return false for none existing value', () => {
      expect(ngCacheService.getCache('111')).toBe(undefined);
    });
  });

  describe('tags data', () => {
    beforeEach(() => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.MEMORY], 'browser', logger);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return null if no tags or tag is not initialized', () => {
      expect(ngCacheService.getTagData('my-tag')).toBe(null);
      ngCacheService.set('111', 111, { tag: 'not-my-tag' });
      expect(ngCacheService.getTagData('my-tag')).toBe(null);
    });

    it('should return tag data', () => {
      ngCacheService.set('111', 111, { tag: 'my-tag' });
      ngCacheService.set('222', null, { tag: 'my-tag' });
      ngCacheService.set('333', 3, { tag: 'my-tag' });
      ngCacheService.set('444', 0, { tag: 'my-tag' });

      const tagInfo = ngCacheService.getTagData('my-tag');
      const tagData = Object.keys(tagInfo).reduce((agg, key) => { agg[key] = tagInfo[key].value; return agg; }, {} as { [key: string]: any });

      expect(tagData).toEqual({
        '111': 111,
        '222': null,
        '333': 3,
        '444': 0
      });

      ngCacheService.remove('111');
      ngCacheService.remove('222');
      ngCacheService.remove('333');
      ngCacheService.remove('444');

      expect(ngCacheService.getTagData('my-tag')).toBe(null);
    });

    it('should remove data by tag', () => {
      ngCacheService.set('111', 111, { tag: 'my-tag' });
      ngCacheService.set('222', null, { tag: 'my-tag' });
      ngCacheService.set('333', undefined, { tag: 'my-tag' });
      ngCacheService.set('444', 0, { tag: 'my-tag' });

      ngCacheService.removeTag('my-tag');

      expect(ngCacheService.getCache('111')).toBe(undefined);
      expect(ngCacheService.getCache('222')).toBe(undefined);
      expect(ngCacheService.getCache('333')).toBe(undefined);
      expect(ngCacheService.getCache('444')).toBe(undefined);
    });
  });

  describe('mainStorage disabled', () => {
    it('should work without errors with disabled mainStorage', () => {
      ngCacheService = new NgCacheService([CacheStoragesEnum.MEMORY], 'browser', logger);
      const mainStorage: CacheMemoryStorage = (ngCacheService as any).mainStorage;
      spyOn(mainStorage, 'isEnabled').and.returnValue(false);
      spyOn(mainStorage, 'getItem').and.returnValue(undefined);
      spyOn(mainStorage, 'setItem').and.throwError('Failure');
      spyOn(mainStorage, 'removeItem');
      spyOn(mainStorage, 'clear');

      expect(ngCacheService.set('111', 111)).toBeFalsy();
      expect(ngCacheService.getCache('111')).toBe(undefined);
      expect(ngCacheService.exists('111')).toBeFalsy();
      ngCacheService.remove('111');
      ngCacheService.removeAll();
      expect(ngCacheService.set('111', 111, { tag: 'my-tag' })).toBeFalsy();
      expect(ngCacheService.getTagData('my-tag')).toBe(undefined);
      ngCacheService.removeTag('my-tag');
      expect(ngCacheService.getTagData('my-tag')).toBe(undefined);
    });
  });
});
