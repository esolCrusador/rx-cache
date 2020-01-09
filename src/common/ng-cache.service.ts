import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ICacheService } from '../contract/i-cache.service';
import { CacheStoragesEnum } from '../contract/cache-storages.enum';
import { INgCacheOptions } from '../contract/i-ng-cache-options';
import { CacheStorageAbstract } from './storage/cache-storage-abstract.service';
import { CacheSessionStorage } from './storage/session-storage/cache-session-storage.service';
import { CacheLocalStorage } from './storage/local-storage/cache-local-storage.service';
import { CacheMemoryStorage } from './storage/memory/cache-memory.service';
import { IStorageValue } from '../contract/i-storage-value';
import { CacheConfiguration } from './cache.configuration';
import { INgCacheStoreOptions } from '../contract/i-ng-cache-store-options';
import { ICacheValueInfo } from '../contract/i-cache-value-info';
import { ITagsMap } from '../contract/i-tags-map';
import { ICacheLogger, I_CACHE_LOGGER } from './i-cache-logger';
import { CacheHybridStorage } from '@cache/common/storage/hybrid-heap-storage/cache-hybrid-storage.service';

const CACHE_PREFIX = 'CacheService';
const DEFAULT_ENABLED_STORAGE = CacheStoragesEnum.MEMORY;

@Injectable({ providedIn: 'root' })
export class NgCacheService implements ICacheService {
  /**
   * Default cache options
   * @type CacheOptionsInterface
   * @private
   */
  private defaultOptions: INgCacheStoreOptions = {
    cacheExpires: 0,
    preloadExpires: Number.MAX_VALUE,
  };

  /**
   * Cache prefix
   */
  private prefix: string = CACHE_PREFIX;

  private mainStorage: CacheStorageAbstract;
  private readonly fallbackStorageTypes: CacheStoragesEnum[];

  public constructor(storageTypes: CacheConfiguration, @Inject(PLATFORM_ID) private readonly platformId: Object, @Inject(I_CACHE_LOGGER) private readonly logger: ICacheLogger) {
    if (!storageTypes || storageTypes.length < 1) {
      throw new Error('Please specify storage types');
    }

    const mainStorageType = storageTypes[0];
    this.fallbackStorageTypes = storageTypes.slice(1);

    this.mainStorage = this.initStorage(mainStorageType);
    this.validateStorage(this.fallbackStorageTypes);

    const storageType = this.getStorageType();
    if (!storageType) {
      this.logger.error('Cache storage type is not defined | It can lead to unexpected behavior or some missed data if/when user refresh page');
    } else {
      if (isPlatformBrowser(this.platformId)) {
        if (storageType === CacheStoragesEnum.MEMORY && storageTypes.filter(fst => fst === CacheStoragesEnum.LOCAL_STORAGE || fst === CacheStoragesEnum.SESSION_STORAGE).length > 0) {
          this.logger.error('It is using MEMORY cache storage type in browser | The expected storage type is LocalStorage or MemoryStorage | It can lead to missed data if/when user refresh page');
        }
      } else {
        if (storageType !== CacheStoragesEnum.MEMORY) {
          this.logger.error('It is NOT using MEMORY cache storage type in server | The expected storage type is MemoryStorage | It can lead to unexpected behavior in server environment');
        }
      }
    }

    setTimeout(() => this.handleExpiration(), 1000 * 60 /* 1 minute */);
  }

  /**
   * Set data to cache
   * @param key
   * @param value
   * @param options
   */
  public set(key: string, value: any, options?: INgCacheOptions): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    const storageKey = this.toStorageKey(key);
    options = options ? options : this.defaultOptions;

    const itemLength = this.mainStorage.setItem(storageKey, this.toStorageValue(value, options));
    if (itemLength === false) {
      return false;
    }

    if (!this.isSystemKey(key) && options.tag) {
      this.saveTag(options.tag, storageKey);
    }
    if (itemLength > 1000 && (!options || (!options.cacheExpires && !options.cacheMaxAge))) {
      this.saveBigObjectKey(key);
    }

    return true;
  }

  public getCacheValueInfo<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): ICacheValueInfo<TEntity> {
    if (!this.isEnabled()) {
      return undefined;
    }

    const storageValue = this.mainStorage.getItem<IStorageValue<TEntity>>(this.toStorageKey(key));
    if (!storageValue) {
      return undefined;
    }

    const validForCache = this.validateForCache(storageValue);
    const validForPreload = this.validateForPreload(storageValue);

    if (!validForCache && !validForPreload) {
      this.remove(key);
      return undefined;
    }

    return {
      value: retrive && storageValue.value ? retrive(storageValue.value) : storageValue.value,
      validForCache: validForCache,
      validForPreload: validForPreload,
    };
  }

  /**
   * Get data from cache
   * @param key
   * @returns {TEntity}
   */
  public getCache<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): TEntity | undefined {
    const cacheValueInfo = this.getCacheValueInfo(key, retrive);
    if (cacheValueInfo === undefined || !cacheValueInfo.validForCache) {
      return undefined;
    }

    return cacheValueInfo.value;
  }

  /**
   * Get data from cache
   * @param key
   * @returns {TEntity}
   */
  public getPreload<TEntity>(key: string, retrive?: (entity: TEntity) => TEntity): TEntity | undefined {
    const cacheValueInfo = this.getCacheValueInfo(key, retrive);
    if (cacheValueInfo === undefined || !cacheValueInfo.validForPreload) {
      return undefined;
    }

    return cacheValueInfo.value;
  }

  /**
   * Check if value exists
   * @param key
   * @returns {boolean}
   */
  public exists(key: string): boolean {
    return this.getCacheValueInfo(key) !== undefined;
  }

  /**
   * Remove item from cache
   * @param key
   */
  public remove(key: string, check?: boolean) {
    this.mainStorage.removeItem(this.toStorageKey(key));
    if (this.mainStorage.isEnabled(check)) {
      this.removeFromTag(this.toStorageKey(key));
    }
  }

  /**
   * Remove all from cache
   */
  public removeAll() {
    if (!this.isEnabled()) {
      return;
    }

    this.mainStorage.clear();
  }

  /**
   * Get all tag data
   * @param tag
   * @returns {Array}
   */
  public getTagData<TEntity>(tag: string): { [key: string]: ICacheValueInfo<TEntity> } {
    if (!this.isEnabled()) {
      return undefined;
    }

    const tags = this.getItem<ITagsMap>(this.tagsStorageKey());
    const tagKeys: string[] = tags && tags[tag];
    if (!tagKeys || tagKeys.length === 0) {
      return null;
    }

    const result = tagKeys.reduce((agg, key) => {
      key = this.fromStorageKey(key);
      const data = this.getCacheValueInfo<TEntity>(key);
      if (data !== undefined) {
        agg[key] = data;
      }

      return agg;
    }, {} as { [key: string]: ICacheValueInfo<TEntity> });

    return result;
  }

  public getItemExpirations(): { [key: string]: number } {
    if (!this.isEnabled()) {
      return {};
    }

    const tags = this.getItem<ITagsMap>(this.tagsStorageKey());
    if (!tags) {
      return {};
    }

    return Object.keys(tags).reduce((tagsAgg, tag) => {
      const tagValues = tags[tag];

      for (const valueKey of tagValues) {
        const value = this.getItem<IStorageValue<any>>(valueKey);

        tagsAgg[valueKey] = (value && value.options && (value.options.preloadExpires || value.options.cacheExpires)) || 0;
      }

      return tagsAgg;
    }, {} as { [key: string]: number });
  }

  /**
   * Remove all by tag
   * @param tag
   */
  public removeTag(tag: string) {
    if (!this.isEnabled()) {
      return;
    }

    const tags = this.getItem<ITagsMap>(this.tagsStorageKey()) || {};
    if (tags[tag]) {
      tags[tag].forEach((key: string) => {
        this.mainStorage.removeItem(key);
      });
      delete tags[tag];
      this.set(this.tagsStorageKey(), tags);
    }
  }

  /**
   * Set global cache key prefix
   * @param prefix
   */
  public setGlobalPrefix(prefix: string) {
    this.prefix = prefix;
  }

  public getStorageType(): CacheStoragesEnum {
    if (this.mainStorage) {
      return this.mainStorage.type();
    }
    return undefined;
  }

  /**
   * Validate cache mainStorage
   * @private
   */
  private validateStorage(fallbackStorageTypes: CacheStoragesEnum[]) {
    if (!this.mainStorage || !this.mainStorage.isEnabled()) {
      if (fallbackStorageTypes || fallbackStorageTypes.length > 0) {
        for (const fallbackStorageType of fallbackStorageTypes) {
          const fallbackStorage = this.initStorage(fallbackStorageType);

          if (fallbackStorage && fallbackStorage.isEnabled()) {
            this.mainStorage = fallbackStorage;
            break;
          }
        }
      }
    }

    if (!this.mainStorage || !this.mainStorage.isEnabled()) {
      this.mainStorage = this.initStorage(DEFAULT_ENABLED_STORAGE);
    }
  }

  /**
   * Remove key from tags keys list
   * @param key
   * @private
   */
  private removeFromTag(key: string) {
    const tags = this.getItem<ITagsMap>(this.tagsStorageKey()) || {};
    let index: number;
    for (const tag of Object.keys(tags)) {
      index = tags[tag].indexOf(key);
      if (index !== -1) {
        tags[tag].splice(index, 1);
        this.set(this.tagsStorageKey(), tags);
        break;
      }
    }
  }

  /**
   * Init mainStorage by type
   * @param type
   * @returns {CacheStorageAbstract}
   */
  private initStorage(type: CacheStoragesEnum) {
    let mainStorage: CacheStorageAbstract;
    switch (type) {
      case CacheStoragesEnum.SESSION_STORAGE: {
        mainStorage = new CacheSessionStorage();
        break;
      }
      case CacheStoragesEnum.LOCAL_STORAGE: {
        mainStorage = new CacheLocalStorage();
        break;
      }
      case CacheStoragesEnum.HYBRID: {
        mainStorage = new CacheHybridStorage(CACHE_PREFIX, new CacheLocalStorage(), 5000);
        break;
      }
      default: {
        mainStorage = new CacheMemoryStorage();
      }
    }
    return mainStorage;
  }

  private toStorageKey(key: string) {
    return this.getCachePrefix() + key;
  }

  private fromStorageKey(key: string) {
    return key.replace(this.getCachePrefix(), '');
  }

  /**
   * Prepare value to set to mainStorage
   * @param value
   * @param options
   * @returns {{value: any, options: CacheOptionsInterface}}
   * @private
   */
  private toStorageValue<TEntity>(value: TEntity, options: INgCacheOptions): IStorageValue<TEntity> {
    return {
      value: value,
      options: this.toStorageOptions(options),
    };
  }

  /**
   * Prepare options to set to mainStorage
   * @param options
   * @returns {CacheOptionsInterface}
   * @private
   */
  private toStorageOptions(options: INgCacheOptions): INgCacheOptions {
    const storageOptions: INgCacheOptions = {};
    storageOptions.cacheExpires = options.cacheExpires || (options.cacheMaxAge && Date.now() + options.cacheMaxAge) || this.defaultOptions.cacheExpires;
    storageOptions.preloadExpires = options.preloadExpires || (options.preloadMaxAge && Date.now() + options.preloadMaxAge) || this.defaultOptions.preloadExpires;

    return storageOptions;
  }

  /**
   * Validate mainStorage value
   * @param value
   * @returns {boolean}
   * @private
   */
  private validateForCache<TEntity>(value: IStorageValue<TEntity>) {
    return !!value.options.cacheExpires && value.options.cacheExpires > Date.now();
  }

  /**
   * Validate mainStorage value
   * @param value
   * @returns {boolean}
   * @private
   */
  private validateForPreload<TEntity>(value: IStorageValue<TEntity>) {
    return !!value.options.preloadExpires && value.options.preloadExpires > Date.now();
  }

  /**
   * check if its system cache key
   * @param key
   * @returns {boolean}
   * @private
   */
  private isSystemKey(key: string) {
    return [this.tagsStorageKey()].indexOf(key) !== -1;
  }

  /**
   * Save tag to list of tags
   * @param tag
   * @param key
   * @private
   */
  private saveTag(tag: string, key: string) {
    const tags = this.getItem<ITagsMap>(this.tagsStorageKey()) || {};
    if (!tags[tag]) {
      tags[tag] = [key];
    } else {
      tags[tag].push(key);
    }
    this.setItem(this.tagsStorageKey(), tags);
  }

  /**
   * Save tag to list of tags
   * @param tag
   * @param key
   * @private
   */
  private saveBigObjectKey(key: string) {
    const bigObjects = this.getItem<string[]>(this.bigObjectsKey()) || [];
    if (bigObjects.includes(key)) {
      return;
    }

    bigObjects.push(key);

    this.setItem(this.bigObjectsKey(), bigObjects);
  }

  /**
   * Get global cache prefix
   * @returns {string}
   * @private
   */
  private getCachePrefix() {
    return this.prefix;
  }

  private tagsStorageKey() {
    return 'CacheService_tags';
  }

  private bigObjectsKey() {
    return 'CacheService_bigObjects';
  }

  private getItem<TItem>(key: string) {
    if (!this.isEnabled()) {
      return undefined;
    }

    return this.mainStorage.getItem<TItem>(key);
  }

  private setItem<TItem>(key: string, item: TItem): number | false {
    if (!this.isEnabled()) {
      return undefined;
    }

    return this.mainStorage.setItem<TItem>(key, item);
  }

  private isEnabled(check?: boolean): boolean {
    let isEnabled = this.mainStorage.isEnabled(check);
    if (!isEnabled) {
      const bigObjects = this.mainStorage.getItem<string[]>(this.bigObjectsKey(), true);
      if (bigObjects && bigObjects.length > 0) {
        for (const key of bigObjects) {
          this.remove(key, true);
        }
      }

      try {
        this.mainStorage.setItem(this.bigObjectsKey(), []);
      } catch {}

      isEnabled = this.mainStorage.isEnabled(true);
      if (!isEnabled) {
        this.mainStorage.clear();
      }
      isEnabled = this.mainStorage.isEnabled(true);
    }

    return isEnabled;
  }

  private handleExpiration() {
    const expirations = this.getItemExpirations();
    const expired = this.getExpired(expirations);

    if (expired) {
      for (const exp of expired) {
        this.remove(exp);
      }
    }

    setTimeout(() => this.handleExpiration(), 1000 * 60 * 10 /* 10 minutes */);
  }

  private getExpired(items: { [key: string]: number }): string[] {
    let expired: string[] = null;

    const date = new Date().getTime();
    for (const itemKey of Object.keys(items)) {
      const itemExpiration = items[itemKey];

      if (itemExpiration < date) {
        (expired || (expired = [])).push(itemKey);
      }
    }

    return expired;
  }
}
