import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';
import * as _ from 'lodash';
import { IStorageValue } from '../../../contract/i-storage-value';

/**
 * Service for storing data in hybrid storage (primarly in memory and uses persistent localStorage as backup)
 */
export class CacheHybridStorage extends CacheStorageAbstract {
  private readonly _interval: number;

  private data: { [key: string]: any } = {};
  private isPersistent: boolean;

  private removedItems = [];
  private changedKeys: string[];

  constructor(private readonly cachePrefix: string, private readonly persistentStorage: CacheStorageAbstract, backupFrequency: number = 1000, private readonly timeoutValuebleDifference = 0.10) {
    super();

    this.isPersistent = true;
    this.changedKeys = [];
    this.data = this.load();

    this._interval = setInterval(() => { this.save(); }, backupFrequency) as any as number;
  }

  public getItem<TItem>(key: string, force?: boolean): TItem {
    return this.data[key] ? this.data[key] : null;
  }

  public setItem<TItem>(key: string, value: TItem): number | false {
    const existing = this.data[key];
    if (!existing && !value) {
      return 1;
    }

    if (_.isEqual(existing, value)) {
      return 1;
    }

    if (value && existing && value.hasOwnProperty('options')) {
      const storageValue: IStorageValue<any> = value as any as IStorageValue<any>;
      if (storageValue.options.hasOwnProperty('cacheExpires') && storageValue.options.hasOwnProperty('preloadExpires')) {
        const time = new Date().getTime();

        const existingStorageValue: IStorageValue<any> = existing as any as IStorageValue<any>;
        if (// Value is the same and timeout has changed less than timeoutValuebleDifference (10% by default).
          _.isEqual(existingStorageValue.value, storageValue.value)
          && this.getRaltiveExpirationDifference(existingStorageValue.options.cacheExpires, storageValue.options.cacheExpires, time) < this.timeoutValuebleDifference
          && this.getRaltiveExpirationDifference(existingStorageValue.options.preloadExpires, storageValue.options.preloadExpires, time) < this.timeoutValuebleDifference
        ) {
          return 1;
        }
      }
    }

    this.changedKeys.push(key);
    this.data[key] = value;
    return 1;
  }

  public removeItem(key: string) {
    delete this.data[key];
    this.removedItems.push(key);
  }

  public clear() {
    this.data = {};
  }

  public type() {
    return CacheStoragesEnum.HYBRID;
  }

  public isEnabled(check?: boolean) {
    return this.persistentStorage.isEnabled(check);
  }

  public length() {
    return Object.keys(this.data).length;
  }

  public key(index: number) {
    const keys = Object.keys(this.data);
    return keys.length > index ? keys[index] : null;
  }

  private save() {
    if (!this.isPersistent) {
      return;
    }

    const data = _.cloneDeep(this.data);
    this.cleanUpPersistentStorage();

    if (this.changedKeys.length > 0) {
      for (const key of this.changedKeys) {
        this.persistentStorage.setItem(key, data[key]);
      }

      this.changedKeys.length = 0;
    }
  }

  private cleanUpPersistentStorage() {
    const removedItems = _.cloneDeep(this.removedItems);
    this.removedItems = [];
    for (const ri of removedItems) {
      this.persistentStorage.removeItem(ri);
    }
  }

  private load(): { [key: string]: any } {
    const data: { [key: string]: any } = {};
    for (let i = 0; i < this.persistentStorage.length(); i++) {
      const key = this.persistentStorage.key(i);

      if (key && key.startsWith(this.cachePrefix)) {
        data[key] = this.persistentStorage.getItem(key);
      }
    }

    return data;
  }

  public persist(): void {
    if (this.isPersistent) {
      return;
    }

    this.isPersistent = true;
    this.changedKeys.push(...Object.keys(this.data));

    this.save();
  }

  public unpersist(prefix: string): void {
    this.isPersistent = false;

    this.persistentStorage.unpersist(prefix);
  }

  public destroy(): void {
    clearInterval(this._interval);
  }

  private getRaltiveExpirationDifference(oldExpiration: number, newExpiration: number, time: number): number {
    if (newExpiration === oldExpiration) {
      return 0;
    }

    const oldRelativeExpiration = oldExpiration - time;
    const newRelativeExpiration = newExpiration - time;

    return (newRelativeExpiration - oldRelativeExpiration) / newRelativeExpiration;
  }
}
