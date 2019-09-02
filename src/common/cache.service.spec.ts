import { CacheService } from './cache.service';
import { MockCacheService } from './ng-cache-mock.service';
import { EntityCacheService } from './entity-cache.service';
import * as moment from 'moment';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(new MockCacheService());
  });

  describe('for', () => {
    it('should create cache service', () => {
      const entityCache = cacheService.for<{}>('Entity', {});
      expect(entityCache).toBeDefined();
      expect(entityCache instanceof EntityCacheService).toBeTruthy();
    });

    it('should get same server if it is called from other place', () => {
      const entityCache = cacheService.for<{}>('Entity', { preloadMaxAge: moment.duration(1, 'hour') });
      const entityCache2 = cacheService.for<{}>('Entity', { preloadMaxAge: moment.duration(1, 'hour') });

      expect(entityCache).toBe(entityCache2);
    });

    it('should fail if cache is resolved with different options', (done: DoneFn) => {
      const entityCache = cacheService.for<{}>('Entity', { preloadMaxAge: moment.duration(1, 'hour') });
      expect(entityCache).toBeDefined();

      try {
        const entityCache2 = cacheService.for<{}>('Entity', { preloadMaxAge: moment.duration(2, 'hours') });
        expect(entityCache2).not.toBeDefined();
        done.fail();
      } catch (ex) {
        expect(ex).toBeDefined();
        done();
      }
    });
  });
});
