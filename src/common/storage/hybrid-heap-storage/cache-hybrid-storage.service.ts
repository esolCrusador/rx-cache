import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';
import * as _ from 'lodash';

/**
 * Service for storing data in hybrid storage (primarly in memory and uses persistent localStorage as backup)
 */
export class CacheHybridStorage extends CacheStorageAbstract {
  private readonly _interval: number;

  private _data: { [key: string]: any } = {};
  private _persist: boolean;

  private removedItems = [];
  private changedKeys: string[];

  constructor(private readonly cachePrefix: string, private readonly persistentStorage: CacheStorageAbstract, backupFrequency: number = 1000) {
    super();

    this._persist = true;
    this.changedKeys = [];
    this._data = this.load();

    this._interval = setInterval(() => { this.save(); }, backupFrequency) as any as number;
  }

  public getItem<TItem>(key: string, force?: boolean): TItem {
    return this._data[key] ? this._data[key] : null;
  }

  public setItem<TItem>(key: string, value: TItem): number | false {
    if (_.isEqual(this._data[key], value)) {
      return 1;
    }

    this.changedKeys.push(key);
    this._data[key] = value;
    return 1;
  }

  public removeItem(key: string) {
    delete this._data[key];
    this.removedItems.push(key);
  }

  public clear() {
    this._data = [];
  }

  public type() {
    return CacheStoragesEnum.HYBRID;
  }

  public isEnabled(check?: boolean) {
    return this.persistentStorage.isEnabled(check);
  }

  public length() {
    return Object.keys(this._data).length;
  }

  public key(index: number) {
    const keys = Object.keys(this._data);
    return keys.length > index ? keys[index] : null;
  }

  private save() {
    if (!this._persist) {
      return;
    }

    const data = _.cloneDeep(this._data);
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
    if (this._persist) {
      return;
    }

    this._persist = true;
    this.changedKeys.push(...Object.keys(this._data));

    this.save();
  }

  public unpersist(prefix: string): void {
    this._persist = false;

    this.persistentStorage.unpersist(prefix);
  }

  public destroy(): void {
    clearInterval(this._interval);
  }
}
