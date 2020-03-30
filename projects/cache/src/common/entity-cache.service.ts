import { of, concat, MonoTypeOperatorFunction, Observable } from 'rxjs';
import { map, distinctUntilChanged, tap } from 'rxjs/operators';
import * as _ from 'lodash';
import { ICacheOptions } from '../contract/i-cache.options';
import { IEntityCacheService } from './i-entity-cache.service';
import { INgCacheOptions } from '../contract/i-ng-cache-options';
import { ICacheService } from '../contract/i-cache.service';
import { ICacheValueInfo } from '../contract/i-cache-value-info';

export class EntityCacheService<TEntity> implements IEntityCacheService<TEntity> {
  private readonly defaultOptionsKeys: string[];
  private readonly defaultOptions: INgCacheOptions;
  private readonly prefix: string;

  private retrive: (entity: TEntity) => TEntity;

  constructor(
    private readonly ngCacheService: ICacheService,
    cachePrefix: string,
    options?: ICacheOptions
  ) {
    this.prefix = `.${cachePrefix}`;
    this.defaultOptions = this.enrichDefaultOptions(this.convertNgOptions(options));
    this.defaultOptionsKeys = Object.keys(this.defaultOptions);
  }

  public areOptionsSame(options: ICacheOptions): boolean {
    return _.isEqual(this.enrichDefaultOptions(this.convertNgOptions(options)), this.defaultOptions);
  }

  public setRetriveMethod(retrive: (entity: TEntity) => TEntity): IEntityCacheService<TEntity> {
    this.retrive = retrive;

    return this;
  }

  public useCache<TId>(id: TId, preload: boolean = true): MonoTypeOperatorFunction<TEntity> {
    return obs$ => {
      const key = this.getKey(id);
      let info: ICacheValueInfo<TEntity> = null;

      if (this.defaultOptions.cacheExpires || this.defaultOptions.cacheMaxAge) {
        info = this.ngCacheService.getCacheValueInfo<TEntity>(key, this.retrive);
      }

      if (info && info.validForCache) {
        return of(info.value);
      }

      let result$ = obs$.pipe(tap(value => this.ngCacheService.set(key, value, this.defaultOptions)));

      if (preload) {
        if (!info) {
          info = this.ngCacheService.getCacheValueInfo<TEntity>(key, this.retrive);
        }

        if (info && info.validForPreload) {
          result$ = concat(of(info.value), result$).pipe(distinctUntilChanged((oldValue, newValue) => _.isEqual(oldValue, newValue)));
        }
      }

      return result$;
    };
  }

  public useMapCache(makeRequest$: (ids: string[]) => Observable<{ [id: string]: TEntity }>, ids: string[], preload?: boolean): Observable<{ [id: string]: TEntity }>;
  public useMapCache(makeRequest$: (ids: number[]) => Observable<{ [id: string]: TEntity }>, ids: number[], preload?: boolean): Observable<{ [id: string]: TEntity }>;
  public useMapCache(makeRequest$: (ids: any[]) => Observable<{ [id: string]: TEntity }>, ids: any[], preload?: boolean): Observable<{ [id: string]: TEntity }> {
    const idKeys = ids.reduce((agg, id) => { agg[id] = this.getKey(id); return agg; }, {} as { [id: string]: string });
    let requestIds: (string | number)[] = ids;
    let existingIds: (string | number)[] = null;

    let cacheInfo: { [id: string]: ICacheValueInfo<TEntity> } = null;
    if (this.defaultOptions.cacheExpires || this.defaultOptions.cacheMaxAge) {
      cacheInfo = this.getMapCacheInfo(ids, idKeys);

      existingIds = ids.filter(id => cacheInfo[id] && cacheInfo[id].validForCache);

      if (ids.length === existingIds.length) {
        return of(ids.reduce((agg, id) => { agg[id] = cacheInfo[id].value; return agg; }, {} as { [id: string]: TEntity }));
      }

      if (existingIds.length > 0) {
        requestIds = ids.filter(id => !existingIds.includes(id));
      } else {
        existingIds = null;
      }
    }

    let result$ = makeRequest$(requestIds).pipe(tap(m => {
      for (const id of Object.keys(m)) {
        this.ngCacheService.set(this.getKey(id), m[id], this.defaultOptions);
      }
    }));

    if (existingIds) {
      result$ = result$.pipe(tap(result => {
        for (const id of existingIds) {
          if (!result[id]) {
            result[id] = cacheInfo[id].value;
          }
        }
      }));
    }

    if (preload) {
      if (!cacheInfo) {
        cacheInfo = this.getMapCacheInfo(ids, idKeys);
      }

      if (cacheInfo && ids.every(id => cacheInfo[id] && cacheInfo[id].validForPreload)) {
        result$ = concat(of(ids.reduce((agg, id) => { agg[id] = cacheInfo[id].value; return agg; }, {} as { [id: string]: TEntity })), result$);
      }
    }

    return result$;
  }

  public getInfo<TId>(idParam: TId): ICacheValueInfo<TEntity> {
    return this.ngCacheService.getCacheValueInfo(this.getKey(idParam));
  }

  public get<TId>(idParam: TId): TEntity {
    const valueInfo = this.getInfo<TId>(idParam);

    return valueInfo ? valueInfo.value : undefined;
  }

  public set<TId>(idParam: TId, valueParam: TEntity, options?: ICacheOptions) {
    const ngOptions = this.mergeNgOptions(options);

    this.ngCacheService.set(this.getKey(idParam), valueParam, ngOptions);
  }

  public update<TId>(idParam: TId, update: (data: TEntity) => void, options?: ICacheOptions): void {
    const current = this.get(idParam);
    if (current !== undefined) {
      update(current);
      if (typeof current !== 'object') {
        throw new Error(`Operation "update" for type ${typeof current} is not supported`);
      }

      this.set(idParam, current, options);
    }
  }

  public remove<TId>(idParam: TId): void {
    this.ngCacheService.remove(this.getKey(idParam));
  }

  public setOperator<TId>(id: TId, value?: TEntity, options?: ICacheOptions): MonoTypeOperatorFunction<any> {
    return $obs => $obs.pipe(map(v => { this.set<TId>(id, value !== undefined ? value : v, options); return v; }));
  }

  private getMapCacheInfo(ids: (string | number)[], idKeys: { [id: string]: string }): { [id: string]: ICacheValueInfo<TEntity> } {
    return ids.reduce(
      (agg, id) => {
        const cachedValue = this.ngCacheService.getCacheValueInfo<TEntity>(idKeys[id], this.retrive);
        if (cachedValue) {
          agg[id] = cachedValue;
        }

        return agg;
      },
      {} as { [id: string]: ICacheValueInfo<TEntity> }
    );
  }

  private mergeNgOptions(options: ICacheOptions): INgCacheOptions {
    if (!options) {
      return this.defaultOptions;
    }

    const ngOptions = this.convertNgOptions(options);

    for (const optionKey of this.defaultOptionsKeys) {
      if (!ngOptions.hasOwnProperty(optionKey)) {
        ngOptions[optionKey] = this.defaultOptions[optionKey];
      }
    }

    return ngOptions;
  }

  private convertNgOptions(options: ICacheOptions): INgCacheOptions {
    if (options) {
      const ngOptions: INgCacheOptions = {};

      if (options.hasOwnProperty('tag')) {
        ngOptions.tag = options.tag;
      }
      if (options.preloadMaxAge) {
        ngOptions.preloadMaxAge = options.preloadMaxAge.asMilliseconds();
      }
      if (options.cacheMaxAge) {
        ngOptions.cacheMaxAge = options.cacheMaxAge.asMilliseconds();
      }

      return ngOptions;
    }

    return null;
  }

  private enrichDefaultOptions(options: INgCacheOptions): INgCacheOptions {
    const defaultOptions = options || {};

    if (!defaultOptions.hasOwnProperty('tag')) {
      defaultOptions.tag = this.prefix;
    }

    return defaultOptions;
  }

  private getKey(id: any | null) {
    if (id === null) {
      return this.prefix;
    }

    return `${this.prefix}[${id.toString()}]`;
  }
}
