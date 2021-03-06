import { CacheService } from './cache.service';
import { NgCacheService } from '../common/ng-cache.service';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { ICacheOptions } from '../contract/i-cache.options';
import { IEntityCacheService } from '../common/i-entity-cache.service';
import { Subject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as moment from 'moment';
import { ICacheLogger } from '../common/i-cache-logger';
import { MultipleDoneByCategory } from '../tests/multiple-done-by-category';
import { NgZone } from '@angular/core';

interface IMap<TEntity> {
  [key: string]: TEntity;
}

describe('EntityCacheService', () => {
  interface ITestEntity {
    id: number;
    name: string;
    value: string;
  }

  const testDatabase: IMap<ITestEntity> = {
    33: {
      id: 33,
      name: '33',
      value: 'ggg'
    },
    54: {
      id: 54,
      name: '53',
      value: 'aaadsa'
    },
    65: {
      id: 65,
      name: '65',
      value: 'grtreter'
    },
    99: {
      id: 99,
      name: '99',
      value: 'yrtyrtyrt'
    },
    103: {
      id: 103,
      name: '103',
      value: '6554fdgdg'
    }
  };

  let logger: jasmine.SpyObj<ICacheLogger>;
  let cacheService: CacheService;
  let entityCacheService: IEntityCacheService<ITestEntity>;

  function createEntityCacheService(option?: ICacheOptions): void {
    entityCacheService = cacheService.for<ITestEntity>('TestEntity', option);
  }

  beforeEach(() => {
    logger = jasmine.createSpyObj<ICacheLogger>('Logger', ['error']);
    cacheService = new CacheService(new NgCacheService([CacheStoragesEnum.MEMORY], 'browser', logger, new NgZone({ enableLongStackTrace: false })));
  });

  describe('getLazy', () => {
    const lazyTestCases: Array<{ data1: ITestEntity, data2: ITestEntity, result: ITestEntity, result1?: ITestEntity }> = [
      {
        data1: { id: 3, name: 'qqq', value: 'gg' },
        data2: { id: 3, name: 'qqqq1', value: 'gg3333' },
        result: { id: 3, name: 'qqq', value: 'gg' }
      },
      {
        data1: null,
        data2: { id: 3, name: 'qqqq1', value: 'gg3333' },
        result: null
      },
      {
        data1: -1 as any,
        data2: { id: 3, name: 'qqqq1', value: 'gg3333' },
        result: -1 as any
      },
    ];

    for (const testCase of lazyTestCases) {
      it(`should get '${JSON.stringify(testCase.result)}' if request response '${JSON.stringify(testCase.data1)}' is completed`, () => {
        createEntityCacheService({ cacheMaxAge: moment.duration(1, 'year') });

        const getData1$: Subject<ITestEntity> = new Subject<ITestEntity>();
        const data1: ITestEntity = testCase.data1;
        let result1: ITestEntity;

        const obs1$ = getData1$.pipe(entityCacheService.useCache(null));
        obs1$.subscribe(r => result1 = r);
        getData1$.next(data1);
        expect(result1).toEqual(testCase.hasOwnProperty('result1') ? testCase.result1 : testCase.result);

        const getData2$: Subject<ITestEntity> = new Subject<ITestEntity>();
        const data2: ITestEntity = testCase.data2;
        let result2: ITestEntity;

        const obs2$ = getData2$.pipe(entityCacheService.useCache(null));
        expect(obs1$).not.toBe(obs2$);
        obs2$.subscribe(r => result2 = r);
        getData2$.next(data2);

        expect(result2).toEqual(testCase.result);
      });
    }
  });

  describe('getLazyMap', () => {
    function createGetData(getNext$: Observable<void>): (ids: number[]) => Observable<IMap<ITestEntity>> {
      return ids => getNext$.pipe(map(() => ids.reduce(
        (agg, id) => { agg[id] = { ...testDatabase[id] }; return agg; },
        {} as IMap<ITestEntity>
      )));
    }

    const lazyTestCases: Array<{
      ids1: number[],
      ids2: number[],
      data1: IMap<ITestEntity>,

      shouldBeSameRequests: boolean,
      data2: IMap<ITestEntity>,
      requestParameters2: number[] | null
    }> = [
        {
          ids1: [54, 65],
          ids2: [65, 54, 103],
          data1: { 54: testDatabase[54], 65: testDatabase[65] },

          shouldBeSameRequests: false,
          data2: { 54: testDatabase[54], 65: testDatabase[65], 103: testDatabase[103] },
          requestParameters2: [103]
        },
        {
          ids1: [54, 65, 99, 54],
          ids2: [65, 54, 103],
          data1: { 54: testDatabase[54], 65: testDatabase[65], 99: testDatabase[99] },

          shouldBeSameRequests: false,
          data2: { 54: testDatabase[54], 65: testDatabase[65], 103: testDatabase[103] },
          requestParameters2: [103]
        },
      ];

    for (const testCase of lazyTestCases) {
      it(`should get '${JSON.stringify(testCase.data2)}' if request response '${JSON.stringify(testCase.ids1)}' is completed immidetly`, () => {
        const returnData1$: Subject<void> = new Subject<void>();
        const getData1 = jasmine.createSpy('getData1').and.callFake(createGetData(returnData1$));

        const returnData2$: Subject<void> = new Subject<void>();
        const getData2 = jasmine.createSpy('getData2').and.callFake(createGetData(returnData2$));

        createEntityCacheService({ cacheMaxAge: moment.duration(1, 'year') });

        let result1: IMap<ITestEntity>;
        const obs1$ = entityCacheService.getMap(ids => getData1(ids), testCase.ids1);
        obs1$.subscribe(r => result1 = r);
        returnData1$.next();

        let result2: IMap<ITestEntity>;
        const obs2$ = entityCacheService.getMap(ids => getData2(ids), testCase.ids2);
        obs2$.subscribe(r => result2 = r);
        returnData2$.next();

        if (testCase.shouldBeSameRequests) {
          expect(result1).toEqual(result2);
        } else {
          expect(obs1$).not.toBe(obs2$);
        }

        for (const key of testCase.ids1) {
          if (result2[key]) {
            expect(result1[key]).toEqual(result2[key]);
          }
        }

        if (testCase.requestParameters2) {
          expect(getData2).toHaveBeenCalledWith(testCase.requestParameters2);
        } else {
          expect(getData2).not.toHaveBeenCalled();
        }
      });
    }

    for (const testCase of lazyTestCases) {
      it(`should get '${JSON.stringify(testCase.data2)}' if request response '${JSON.stringify(testCase.ids1)}' is completed later`, () => {
        const returnData1$: Subject<void> = new Subject<void>();
        const getData1 = jasmine.createSpy('getData1').and.callFake(createGetData(returnData1$));

        const returnData2$: Subject<void> = new Subject<void>();
        const getData2 = jasmine.createSpy('getData2').and.callFake(createGetData(returnData2$));

        createEntityCacheService({ cacheMaxAge: moment.duration(1, 'year') });

        let result1: IMap<ITestEntity>;
        const obs1$ = entityCacheService.getMap(ids => getData1(ids), testCase.ids1);
        obs1$.subscribe(r => result1 = r);

        let result2: IMap<ITestEntity>;
        const obs2$ = entityCacheService.getMap(ids => getData2(ids), testCase.ids2);
        obs2$.subscribe(r => result2 = r);
        returnData2$.next();

        returnData1$.next();
        if (testCase.shouldBeSameRequests) {
          expect(obs1$).toBe(obs2$);
          expect(result1).toEqual(result2);
          expect(getData2).not.toHaveBeenCalledWith(testCase.ids2);

          for (const key of testCase.ids1) {
            expect(result1[key]).toBe(result2[key]);
          }
        } else {
          expect(obs1$).not.toBe(obs2$);
          expect(getData2).toHaveBeenCalledWith(testCase.ids2);

          for (const key of testCase.ids1) {
            if (result2[key]) {
              expect(result1[key]).not.toBe(result2[key]);
              expect(result1[key]).toEqual(result2[key]);
            }
          }

          for (const key of testCase.ids2) {
            if (result1[key]) {
              expect(result1[key]).not.toBe(result2[key]);
              expect(result1[key]).toEqual(result2[key]);
            }
          }
        }
      });
    }

    it('should request data again if expired', () => {
      createEntityCacheService({ preloadMaxAge: moment.duration(-1, 'second') });

      const getData$ = jasmine.createSpy('getData').and.callFake(() => of({
        1: { id: 1, name: '2', value: '3' },
        2: { id: 1, name: '2', value: '3' },
        3: { id: 1, name: '2', value: '3' },
      }));
      const getData2$ = jasmine.createSpy('getData2').and.callFake(() => of({
        1: { id: 1, name: '2', value: '3' },
        2: { id: 1, name: '2', value: '3' },
        3: { id: 1, name: '2', value: '3' },
      }));


      getData$([1, 2, 3]).pipe(entityCacheService.useCache([1, 2, 3])).subscribe(r => {
        expect(r).toEqual({
          1: { id: 1, name: '2', value: '3' },
          2: { id: 1, name: '2', value: '3' },
          3: { id: 1, name: '2', value: '3' },
        });
      });
      expect(getData$).toHaveBeenCalledWith([1, 2, 3]);

      getData2$([1, 2, 3]).pipe(entityCacheService.useCache([1, 2, 3])).subscribe();
      expect(getData2$).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('preloadOperator', () => {
    beforeEach(() => {
      createEntityCacheService();
    });

    it('should not quick load if no data in test', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2 });

      of({ id: 1, name: '1', value: '11' }).pipe(entityCacheService.useCache(1, true)).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ id: 2, name: '2', value: '222' }).pipe(entityCacheService.useCache(1, true)).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ id: 2, name: '2', value: '222' }),
          r => expect(r).toEqual({ id: 1, name: '1', value: '11' }),
        ], res);
      });
    });
  });

  describe('getMap', () => {
    beforeEach(() => {
      createEntityCacheService();
    });

    it('should not quick load if no data in test', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2 });

      entityCacheService.getMap(ids => of({ 33: testDatabase[33] }), [33], true).subscribe(r => {
        multipleDone.done('notCached');
      });

      entityCacheService.getMap(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], true).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });
    });

    it('should not quick load data if preload = false', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, notCached2: 1, cached: 1, cachedpreload: 2 });

      entityCacheService.getMap(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], false).subscribe(r => {
        multipleDone.done('notCached');
      });

      entityCacheService.getMap(ids => of({ 33: testDatabase[33] }), [33], false).subscribe(r => {
        multipleDone.done('cached', [data => expect(data).toEqual({ 33: testDatabase[33] })], r);
      });

      entityCacheService.getMap(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], false).subscribe(r => {
        multipleDone.done('notCached2');
      });

      entityCacheService.getMap(ids => of({ 33: testDatabase[33] }), [33], true).subscribe(res => {
        multipleDone.done('cachedpreload', [
          r => expect(r).toEqual({ 33: testDatabase[33] }),
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
        ], res);
      });
    });

    it('should quick load data if it was included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2 });

      entityCacheService.getMap(ids => of({ 33: testDatabase[33], 54: testDatabase[54] }), [33, 54], true).subscribe(r => {
        multipleDone.done('notCached');
      });

      entityCacheService.getMap(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], true).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });
    });

    it('should not quick load data if it was partially included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1 });

      entityCacheService.getMap(ids => of({ 33: testDatabase[33], 54: testDatabase[54] }), [33, 54], true).subscribe(r => {
        multipleDone.done('notCached');
      });


      entityCacheService.getMap(ids => of({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] }), [33, 103], true).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] })
        ], res);
      });
    });
  });

  describe('useMapCache:preload', () => {
    beforeEach(() => {
      createEntityCacheService();
    });

    it('should not quick load if no data in test', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2, completed: 1 });

      of({ 33: testDatabase[33] }).pipe(entityCacheService.useMapCache([33], true)).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(entityCacheService.useMapCache([33], true)).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });

      multipleDone.done('completed');
    });

    it('should not quick load data if preload = false', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 2, notCached2: 1, cachedpreload: 2, completed: 1 });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(
        entityCacheService.useMapCache([33], false)
      ).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: testDatabase[33] }).pipe(
        entityCacheService.useMapCache([33], false)
      ).subscribe(r => {
        multipleDone.done('notCached', [data => expect(data).toEqual({ 33: testDatabase[33] })], r);
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(
        entityCacheService.useMapCache([33], false)
      ).subscribe(r => {
        multipleDone.done('notCached2');
      });

      of({ 33: testDatabase[33] }).pipe(
        entityCacheService.useMapCache([33], true)
      ).subscribe(res => {
        multipleDone.done('cachedpreload', [
          r => expect(r).toEqual({ 33: testDatabase[33] }),
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
        ], res);
      });

      multipleDone.done('completed');
    });

    it('should quick load data if it was included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2, completed: 1 });

      of({ 33: testDatabase[33], 54: testDatabase[54] }).pipe(
        entityCacheService.useMapCache([33, 54], true)
      ).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(
        entityCacheService.useMapCache([33], true)
      ).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });

      multipleDone.done('completed');
    });

    it('should not quick load data if it was partially included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1, completed: 1 });

      of({ 33: testDatabase[33], 54: testDatabase[54] }).pipe(
        entityCacheService.useMapCache([33, 54], true)
      ).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] }).pipe(
        entityCacheService.useMapCache([33, 103], true)
      ).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] })
        ], res);
      });

      multipleDone.done('completed');
    });
  });

  describe('useMapCache:cache', () => {
    beforeEach(() => {
      createEntityCacheService({ cacheMaxAge: moment.duration(1, 'day') });
    });

    it('should load data from cache second time', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1, completed: 1 });

      of({ 33: testDatabase[33] }).pipe(entityCacheService.useMapCache([33], true)).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(entityCacheService.useMapCache([33], true)).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });

      multipleDone.done('completed');
    });

    it('should reload data if keys set changed', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 2, cached: 1, completed: 1 });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(
        entityCacheService.useMapCache([33], false)
      ).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: testDatabase[33] }).pipe(
        entityCacheService.useMapCache([33], false)
      ).subscribe(r => {
        multipleDone.done('cached', [data => expect(data).toEqual({ 33: { id: 2, name: '2', value: '222' } })], r);
      });

      of({ 33: testDatabase[33], 103: { id: 103, name: '103', value: '103' } }).pipe(
        entityCacheService.useMapCache([33, 103], false)
      ).subscribe(r => {
        expect(r).toEqual({ 33: testDatabase[33], 103: { id: 103, name: '103', value: '103' } });
        multipleDone.done('notCached');
      });

      multipleDone.done('completed');
    });

    it('should get data from cache if it was included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1, completed: 1 });

      of({ 33: testDatabase[33], 54: testDatabase[54] }).pipe(
        entityCacheService.useMapCache([33, 54], true)
      ).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(
        entityCacheService.useMapCache([33], true)
      ).subscribe(res => {
        expect(res).toEqual({ 33: testDatabase[33] });

        multipleDone.done('cached');
      });

      multipleDone.done('completed');
    });

    it('should reload load data if it was partially included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1, completed: 1 });

      of({ 33: testDatabase[33], 54: testDatabase[54] }).pipe(
        entityCacheService.useMapCache([33, 54], true)
      ).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] }).pipe(
        entityCacheService.useMapCache([33, 103], true)
      ).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] })
        ], res);
      });

      multipleDone.done('completed');
    });
  });

  describe('useMapCache:formatId', () => {
    beforeEach(() => {
      createEntityCacheService({ cacheMaxAge: moment.duration(1, 'day') });
    });

    it('should get/set data with formated Id', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1, completed: 1 });

      of({ 33: testDatabase[33] }).pipe(entityCacheService.useMapCache([33], true, id => `+${id}`)).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(entityCacheService.useMapCache([33], true, id => `+${id}`)).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });

      multipleDone.done('completed');
    });

    it('should not differently formated data data with formated Id', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, differentKey: 2, completed: 1 });

      of({ 33: testDatabase[33] }).pipe(entityCacheService.useMapCache([33], true, id => `+${id}`)).subscribe(r => {
        multipleDone.done('notCached');
      });

      of({ 33: { id: 2, name: '2', value: '222' } }).pipe(entityCacheService.useMapCache([33], true, id => `-${id}`)).subscribe(res => {
        multipleDone.done('differentKey', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
        ], res);
      });

      of({ 33: { id: 333, name: '333', value: '333' } }).pipe(entityCacheService.useMapCache([33], true)).subscribe(res => {
        multipleDone.done('differentKey', [
          r => expect(r).toEqual({ 33: { id: 333, name: '333', value: '333' } }),
        ], res);
      });

      multipleDone.done('completed');
    });
  });

  describe('AggregatedCacheInfoAccessor', () => {
    interface IUserTestEntity {
      id: number;
      name: string;
    }

    interface IUserWithMetadata {
      user: IUserTestEntity;
      metadata: ITestEntity;
    }

    describe('preload', () => {
      let userCache: IEntityCacheService<IUserTestEntity>;
      let userMetadataCache: IEntityCacheService<ITestEntity>;
      let userWithMetadataCache: IEntityCacheService<IUserWithMetadata>;

      beforeEach(() => {
        userCache = cacheService.for<IUserTestEntity>('user', { preloadMaxAge: moment.duration(1, 'weeks') });
        userMetadataCache = cacheService.for<ITestEntity>('userMetadata', { preloadMaxAge: moment.duration(1, 'weeks') });

        userWithMetadataCache = cacheService.aggregated('userWithMetadata', { user: userCache, metadata: userMetadataCache });
      });

      it('should preload data from few sources', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 1, metadata: 1, userWithMetadata: 2, completed: 1 });

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(() => multipleDone.done('metadata'));

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(result => {
          multipleDone.done('userWithMetadata', [
            r => expect(r).toEqual({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }),
            r => expect(r).toEqual({ user: { id: 1, name: 'Ykstos' }, metadata: { id: 1, name: 'QA', value: 'Senior' } }),
          ], result);
        });

        multipleDone.done('completed');
      });

      it('should preload map data from few sources', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 2, metadata: 2, userWithMetadata: 2, completed: 1 });

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 2, name: 'Sirob' }).pipe(userCache.useCache(2, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(() => multipleDone.done('metadata'));
        of({ id: 2, name: 'BA', value: 'Middle' }).pipe(userMetadataCache.useCache(2, true)).subscribe(() => multipleDone.done('metadata'));

        of({
          '1': { user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } },
          '2': { user: { id: 2, name: 'S' }, metadata: { id: 2, name: 'BA1', value: 'Lead' } }
        }).pipe(
          userWithMetadataCache.useMapCache([1, 2], true)
        ).subscribe(result => {
          multipleDone.done('userWithMetadata', [
            r => expect(r).toEqual({
              '1': { user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } },
              '2': { user: { id: 2, name: 'S' }, metadata: { id: 2, name: 'BA1', value: 'Lead' } }
            }),
            r => expect(r).toEqual({
              '1': { user: { id: 1, name: 'Ykstos' }, metadata: { id: 1, name: 'QA', value: 'Senior' } },
              '2': { user: { id: 2, name: 'Sirob' }, metadata: { id: 2, name: 'BA', value: 'Middle' } }
            }),
          ], result);
        });

        multipleDone.done('completed');
      });

      it('should not preload map data from few sources if one is missing', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 2, metadata: 1, userWithMetadata: 1, completed: 1 });

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 2, name: 'Sirob' }).pipe(userCache.useCache(2, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(() => multipleDone.done('metadata'));

        of({
          '1': { user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } },
          '2': { user: { id: 2, name: 'S' }, metadata: { id: 2, name: 'BA1', value: 'Lead' } }
        }).pipe(
          userWithMetadataCache.useMapCache([1, 2], true)
        ).subscribe(result => {
          expect(result).toEqual({
            '1': { user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } },
            '2': { user: { id: 2, name: 'S' }, metadata: { id: 2, name: 'BA1', value: 'Lead' } }
          });
          multipleDone.done('userWithMetadata');
        });

        multipleDone.done('completed');
      });

      it('should store data for resources', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 2, metadata: 2, userWithMetadata: 1, completed: 1 });

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(() => multipleDone.done('userWithMetadata'));

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(result => {
          multipleDone.done('user', [
            r => expect(r).toEqual({ id: 1, name: 'Ykstos' }),
            r => expect(r).toEqual({ id: 1, name: 'Y' }),
          ], result);
        });
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(result => {
          multipleDone.done('metadata', [
            r => expect(r).toEqual({ id: 1, name: 'QA', value: 'Senior' }),
            r => expect(r).toEqual({ id: 1, name: 'QA1', value: 'Junior' }),
          ], result);
        });

        multipleDone.done('completed');
      });

      it('should request again if some of the data is missing', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 1, metadata: 2, userWithMetadata: 1, completed: 1 });

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(() => multipleDone.done('user'));

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(result => {
          multipleDone.done('userWithMetadata', [
            r => expect(r).toEqual({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }),
          ], result);
        });

        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(result => {
          multipleDone.done('metadata', [
            r => expect(r).toEqual({ id: 1, name: 'QA', value: 'Senior' }),
            r => expect(r).toEqual({ id: 1, name: 'QA1', value: 'Junior' }),
          ], result);
        });

        multipleDone.done('completed');
      });

      it('should remove cache', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 1, metadata: 1, userWithMetadata: 1, completed: 1 });

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(() => multipleDone.done('metadata'));

        userWithMetadataCache.remove(1);

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(result => {
            expect(result).toEqual({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }),
            multipleDone.done('userWithMetadata');
        });

        multipleDone.done('completed');
      });

      it('should remove cache for few resources', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 1, metadata: 1, userWithMetadata: 1, completed: 1 });

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(() => multipleDone.done('userWithMetadata'));

        userWithMetadataCache.remove(1);

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(result => {
           expect(result).toEqual({ id: 1, name: 'Ykstos' }),
           multipleDone.done('user');
        });
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(result => {
            expect(result).toEqual({ id: 1, name: 'QA', value: 'Senior' }),
            multipleDone.done('metadata');
        });

        multipleDone.done('completed');
      });
    });

    describe('cache', () => {
      let userCache: IEntityCacheService<IUserTestEntity>;
      let userMetadataCache: IEntityCacheService<ITestEntity>;
      let userWithMetadataCache: IEntityCacheService<IUserWithMetadata>;

      beforeEach(() => {
        userCache = cacheService.for<IUserTestEntity>('user', { cacheMaxAge: moment.duration(1, 'weeks') });
        userMetadataCache = cacheService.for<ITestEntity>('userMetadata', { cacheMaxAge: moment.duration(1, 'weeks') });

        userWithMetadataCache = cacheService.aggregated<IUserWithMetadata>('userWithMetadata', { user: userCache, metadata: userMetadataCache });
      });

      it('should get data from few sources', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 1, metadata: 1, userWithMetadata: 1, completed: 1 });

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(() => multipleDone.done('user'));
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(() => multipleDone.done('metadata'));

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(result => {
          expect(result).toEqual({ user: { id: 1, name: 'Ykstos' }, metadata: { id: 1, name: 'QA', value: 'Senior' } });
          multipleDone.done('userWithMetadata');
        });

        multipleDone.done('completed');
      });

      it('should store data for resources', (done: DoneFn) => {
        const multipleDone = new MultipleDoneByCategory(done, { user: 1, metadata: 1, userWithMetadata: 1, completed: 1 });

        of({ user: { id: 1, name: 'Y' }, metadata: { id: 1, name: 'QA1', value: 'Junior' } }).pipe(
          userWithMetadataCache.useCache(1, true)
        ).subscribe(result => multipleDone.done('userWithMetadata'));

        of({ id: 1, name: 'Ykstos' }).pipe(userCache.useCache(1, true)).subscribe(result => {
          expect(result).toEqual({ id: 1, name: 'Y' });
          multipleDone.done('user');
        });
        of({ id: 1, name: 'QA', value: 'Senior' }).pipe(userMetadataCache.useCache(1, true)).subscribe(result => {
          expect(result).toEqual({ id: 1, name: 'QA1', value: 'Junior' });
          multipleDone.done('metadata');
        });

        multipleDone.done('completed');
      });
    });
  });
});
