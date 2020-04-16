import { of, concat, MonoTypeOperatorFunction, Observable } from 'rxjs';
import { map, distinctUntilChanged, tap } from 'rxjs/operators';
import * as _ from 'lodash';
import { ICacheOptions } from '../contract/i-cache.options';
import { IEntityCacheService } from '../common/i-entity-cache.service';
import { INgCacheOptions } from '../contract/i-ng-cache-options';
import { ICacheValueInfo } from '../contract/i-cache-value-info';
import { ICacheInfoAccessor } from './I-cache-info.accessor';

export class EntityCacheService<TEntity> implements IEntityCacheService<TEntity> {
  private readonly defaultOptionsKeys: string[];
  private readonly defaultOptions: INgCacheOptions;
  private readonly prefix: string;
  private readonly getKeyDelegate: (id: any | null) => string;

  private retrive: (entity: TEntity) => TEntity;

  constructor(
    private readonly cacheInfoAccessor: ICacheInfoAccessor<TEntity>,
    cachePrefix: string,
    options?: ICacheOptions
  ) {
    this.prefix = `.${cachePrefix}`;
    this.defaultOptions = this.enrichDefaultOptions(this.convertNgOptions(options));
    this.defaultOptionsKeys = Object.keys(this.defaultOptions);
    this.getKeyDelegate = this.getKey.bind(this);
  }

  public areOptionsSame(options: ICacheOptions): boolean {
    return _.isEqual(this.enrichDefaultOptions(this.convertNgOptions(options)), this.defaultOptions);
  }

  public setRetriveMethod(retrive: (entity: TEntity) => TEntity): IEntityCacheService<TEntity> {
    this.retrive = retrive;

    return this;
  }

  public useCache<TId>(entityId: TId, preload: boolean = true, formatId?: (id: TId) => string): MonoTypeOperatorFunction<TEntity> {
    const getKey = formatId ? (id: TId) => this.getKeyDelegate(formatId(id)) : this.getKeyDelegate;

    return obs$ => {
      let info: ICacheValueInfo<TEntity> = null;

      info = this.cacheInfoAccessor.getCacheValueInfo(entityId, getKey, this.retrive);

      if (info && info.validForCache) {
        return of(info.value);
      }

      let result$ = obs$.pipe(tap(value => this.cacheInfoAccessor.set(entityId, getKey, value, this.defaultOptions)));

      if (preload && info && info.validForPreload) {
        result$ = concat(of(info.value), result$).pipe(distinctUntilChanged((oldValue, newValue) => _.isEqual(oldValue, newValue)));
      }

      return result$;
    };
  }

  public useMapCache(ids: (string | number)[], preload?: boolean, formatId?: (id: (string | number)) => string): MonoTypeOperatorFunction<{ [id: string]: TEntity }> {
    const getKey = formatId ? (id: string | number) => this.getKeyDelegate(formatId(id)) : this.getKeyDelegate;

    return obs$ => {
      const cacheInfo: { [id: string]: ICacheValueInfo<TEntity> } = this.getMapCacheInfo(ids, getKey);

      if (this.defaultOptions.cacheExpires || this.defaultOptions.cacheMaxAge) {
        if (ids.every(id => cacheInfo[id] && cacheInfo[id].validForCache)) {
          return of(ids.reduce((agg, id) => { agg[id] = cacheInfo[id].value; return agg; }, {} as { [id: string]: TEntity }));
        }
      }

      obs$ = obs$.pipe(tap(m => {
        for (const id of Object.keys(m)) {
          this.cacheInfoAccessor.set(id, getKey, m[id], this.defaultOptions);
        }
      }));

      if (preload) {
        if (cacheInfo && ids.every(id => cacheInfo[id] && cacheInfo[id].validForPreload)) {
          obs$ = concat(of(ids.reduce((agg, id) => { agg[id] = cacheInfo[id].value; return agg; }, {} as { [id: string]: TEntity })), obs$);
        }
      }

      return obs$;
    };
  }

  public getMap(makeRequest$: (ids: string[]) => Observable<{ [id: string]: TEntity }>, ids: string[], preload?: boolean): Observable<{ [id: string]: TEntity }>;
  public getMap(makeRequest$: (ids: number[]) => Observable<{ [id: string]: TEntity }>, ids: number[], preload?: boolean): Observable<{ [id: string]: TEntity }>;
  public getMap(makeRequest$: (ids: any[]) => Observable<{ [id: string]: TEntity }>, ids: any[], preload?: boolean): Observable<{ [id: string]: TEntity }> {
    let requestIds: (string | number)[] = ids;
    let existingIds: (string | number)[] = null;

    let cacheInfo: { [id: string]: ICacheValueInfo<TEntity> } = null;
    if (this.defaultOptions.cacheExpires || this.defaultOptions.cacheMaxAge) {
      cacheInfo = this.getMapCacheInfo(ids, this.getKeyDelegate);

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
        this.cacheInfoAccessor.set(id, this.getKeyDelegate, m[id], this.defaultOptions);
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
        cacheInfo = this.getMapCacheInfo(ids, this.getKeyDelegate);
      }

      if (cacheInfo && ids.every(id => cacheInfo[id] && cacheInfo[id].validForPreload)) {
        result$ = concat(of(ids.reduce((agg, id) => { agg[id] = cacheInfo[id].value; return agg; }, {} as { [id: string]: TEntity })), result$);
      }
    }

    return result$;
  }

  public getInfo<TId>(idParam: TId): ICacheValueInfo<TEntity> {
    return this.cacheInfoAccessor.getCacheValueInfo(idParam, this.getKeyDelegate, this.retrive);
  }

  public get<TId>(idParam: TId): TEntity {
    const valueInfo = this.getInfo<TId>(idParam);

    return valueInfo ? valueInfo.value : undefined;
  }

  public set<TId>(idParam: TId, valueParam: TEntity, options?: ICacheOptions) {
    const ngOptions = this.mergeNgOptions(options);

    this.cacheInfoAccessor.set(idParam, this.getKeyDelegate, valueParam, ngOptions);
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
    this.cacheInfoAccessor.remove(idParam, this.getKeyDelegate);
  }

  public setOperator<TId>(id: TId, value?: TEntity, options?: ICacheOptions): MonoTypeOperatorFunction<any> {
    return $obs => $obs.pipe(map(v => { this.set<TId>(id, value !== undefined ? value : v, options); return v; }));
  }

  private getMapCacheInfo(ids: (string | number)[], getKey: (id: (string | number)) => string): { [id: string]: ICacheValueInfo<TEntity> } {
    return ids.reduce(
      (agg, id) => {
        const cachedValue = this.cacheInfoAccessor.getCacheValueInfo(id, getKey, this.retrive);
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

  private getKey(id: any | null): string {
    if (id === null) {
      return this.prefix;
    }

    return `${this.prefix}[${id.toString()}]`;
  }
}
