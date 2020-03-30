import { Injectable } from '@angular/core';
import { ICacheService } from '../contract/i-cache.service';
import { INgCacheOptions } from '../contract/i-ng-cache-options';
import { ICacheValueInfo } from '../contract/i-cache-value-info';

/**
 * Mocked empty cache to use in test
 * Do nothing
 * @export
 * @class MockCache
 * @extends {CacheService}
 * @implements {ICacheService}
 */
@Injectable()
export class MockCacheService implements ICacheService {
  public getCacheValueInfo<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): ICacheValueInfo<TEntity> {
    return undefined;
  }
  public getCache<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): TEntity {
    return undefined;
  }
  public getPreload<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): TEntity {
    return undefined;
  }
  public set(key: string, value: any, options?: INgCacheOptions): boolean {
    return false;
  }
  public get(key: string) {
    return undefined;
  }
  public exists(key: string): boolean {
    return false;
  }
  public remove(key: string) { }
  public removeAll() { }
  public getTagData(tag: string): { [key: string]: any } {
    return undefined;
  }
  public removeTag(tag: string) { }
  public setGlobalPrefix(prefix: string) { }

  public persist(): void {
  }

  public unpersist(): void {
  }
}
