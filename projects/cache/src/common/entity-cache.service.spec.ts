import { CacheService } from './cache.service';
import { NgCacheService } from './ng-cache.service';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { ICacheOptions } from '../contract/i-cache.options';
import { IEntityCacheService } from './i-entity-cache.service';
import { Subject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as moment from 'moment';
import { ICacheLogger } from './i-cache-logger';
import { MultipleDoneByCategory } from '../tests/multiple-done-by-category';

interface IMap<TEntity> {
  [key: string]: TEntity;
}

describe('EntityCacheService', () => {
  interface TestEntity {
    id: number;
    name: string;
    value: string;
  }

  const testDatabase: IMap<TestEntity> = {
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
  let entityCacheService: IEntityCacheService<TestEntity>;

  function createEntityCacheService(option?: ICacheOptions): void {
    entityCacheService = cacheService.for<TestEntity>('TestEntity', option);
  }

  beforeEach(() => {
    logger = jasmine.createSpyObj<ICacheLogger>('Logger', ['error']);
    cacheService = new CacheService(new NgCacheService([CacheStoragesEnum.MEMORY], 'browser', logger));
  });

  describe('getLazy', () => {
    const lazyTestCases: Array<{ data1: TestEntity, data2: TestEntity, result: TestEntity, result1?: TestEntity }> = [
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

        const getData1$: Subject<TestEntity> = new Subject<TestEntity>();
        const data1: TestEntity = testCase.data1;
        let result1: TestEntity;

        const obs1$ = getData1$.pipe(entityCacheService.useCache(null));
        obs1$.subscribe(r => result1 = r);
        getData1$.next(data1);
        expect(result1).toEqual(testCase.hasOwnProperty('result1') ? testCase.result1 : testCase.result);

        const getData2$: Subject<TestEntity> = new Subject<TestEntity>();
        const data2: TestEntity = testCase.data2;
        let result2: TestEntity;

        const obs2$ = getData2$.pipe(entityCacheService.useCache(null));
        expect(obs1$).not.toBe(obs2$);
        obs2$.subscribe(r => result2 = r);
        getData2$.next(data2);

        expect(result2).toEqual(testCase.result);
      });
    }
  });

  describe('getLazyMap', () => {
    function createGetData(getNext$: Observable<void>): (ids: number[]) => Observable<IMap<TestEntity>> {
      return ids => getNext$.pipe(map(() => ids.reduce(
        (agg, id) => { agg[id] = { ...testDatabase[id] }; return agg; },
        {} as IMap<TestEntity>
      )));
    }

    const lazyTestCases: Array<{
      ids1: number[],
      ids2: number[],
      data1: IMap<TestEntity>,

      shouldBeSameRequests: boolean,
      data2: IMap<TestEntity>,
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

        let result1: IMap<TestEntity>;
        const obs1$ = entityCacheService.useMapCache(ids => getData1(ids), testCase.ids1);
        obs1$.subscribe(r => result1 = r);
        returnData1$.next();

        let result2: IMap<TestEntity>;
        const obs2$ = entityCacheService.useMapCache(ids => getData2(ids), testCase.ids2);
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

        let result1: IMap<TestEntity>;
        const obs1$ = entityCacheService.useMapCache(ids => getData1(ids), testCase.ids1);
        obs1$.subscribe(r => result1 = r);

        let result2: IMap<TestEntity>;
        const obs2$ = entityCacheService.useMapCache(ids => getData2(ids), testCase.ids2);
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

  describe('useMapCache', () => {
    beforeEach(() => {
      createEntityCacheService();
    });

    it('should not quick load if no data in test', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2 });

      entityCacheService.useMapCache(ids => of({ 33: testDatabase[33] }), [33], true).subscribe(r => {
        multipleDone.done('notCached');
      });

      entityCacheService.useMapCache(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], true).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });
    });

    it('should not quick load data if preload = false', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, notCached2: 1, cached: 1, cachedpreload: 2 });

      entityCacheService.useMapCache(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], false).subscribe(r => {
        multipleDone.done('notCached');
      });

      entityCacheService.useMapCache(ids => of({ 33: testDatabase[33] }), [33], false).subscribe(r => {
        multipleDone.done('cached', [data => expect(data).toEqual({ 33: testDatabase[33] })], r);
      });

      entityCacheService.useMapCache(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], false).subscribe(r => {
        multipleDone.done('notCached2');
      });

      entityCacheService.useMapCache(ids => of({ 33: testDatabase[33] }), [33], true).subscribe(res => {
        multipleDone.done('cachedpreload', [
          r => expect(r).toEqual({ 33: testDatabase[33] }),
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
        ], res);
      });
    });

    it('should quick load data if it was included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 2 });

      entityCacheService.useMapCache(ids => of({ 33: testDatabase[33], 54: testDatabase[54] }), [33, 54], true).subscribe(r => {
        multipleDone.done('notCached');
      });

      entityCacheService.useMapCache(ids => of({ 33: { id: 2, name: '2', value: '222' } }), [33], true).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' } }),
          r => expect(r).toEqual({ 33: testDatabase[33] }),
        ], res);
      });
    });

    it('should not quick load data if it was partially included in other request', (done: DoneFn) => {
      const multipleDone = new MultipleDoneByCategory(done, { notCached: 1, cached: 1 });

      entityCacheService.useMapCache(ids => of({ 33: testDatabase[33], 54: testDatabase[54] }), [33, 54], true).subscribe(r => {
        multipleDone.done('notCached');
      });


      entityCacheService.useMapCache(ids => of({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] }), [33, 103], true).subscribe(res => {
        multipleDone.done('cached', [
          r => expect(r).toEqual({ 33: { id: 2, name: '2', value: '222' }, 103: testDatabase[103] })
        ], res);
      });
    });
  });
});
