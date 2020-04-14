import { ICacheOptions } from '../contract/i-cache.options';
import { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { ICacheValueInfo } from '../contract/i-cache-value-info';

export interface IEntityCacheService<TEntity> {
  areOptionsSame(options: ICacheOptions): boolean;

  setRetriveMethod(retrive: (entity: TEntity) => TEntity): IEntityCacheService<TEntity>;

  useCache<TId = any>(id: TId, preload?: boolean): MonoTypeOperatorFunction<TEntity>;
  useMapCache(ids: (string | number)[], preload?: boolean, formatId?: (id: (string | number)) => string): MonoTypeOperatorFunction<{ [id: string]: TEntity }>;
  getMap(makeRequest$: (ids: string[]) => Observable<{ [id: string]: TEntity }>, ids: string[], preload?: boolean): Observable<{ [id: string]: TEntity }>;
  getMap(makeRequest$: (ids: number[]) => Observable<{ [id: string]: TEntity }>, ids: number[], preload?: boolean): Observable<{ [id: string]: TEntity }>;

  getInfo<TId>(idParam: TId): ICacheValueInfo<TEntity>;
  get<TId>(idParam: TId): TEntity;

  set<TId>(idParam: TId, valueParam: TEntity, options?: ICacheOptions);

  update<TId>(idParam: TId, update: (data: TEntity) => void, options?: ICacheOptions): void;

  remove<TId>(idParam: TId): void;

  setOperator<TId>(id: TId, value?: TEntity, options?: ICacheOptions): MonoTypeOperatorFunction<any>;
}
