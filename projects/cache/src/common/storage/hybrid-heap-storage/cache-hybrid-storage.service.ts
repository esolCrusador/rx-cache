import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';
import * as _ from 'lodash';

/**
 * Service for storing data in hybrid storage (primarly in memory and uses persistent localStorage as backup)
 */
export class CacheHybridStorage extends CacheStorageAbstract {
  private _data: { [key: string]: any } = {};

  private removedItems = [];
  private hasChanges: boolean = false;

  constructor(private readonly cachePrefix: string, private readonly persistentStorage: CacheStorageAbstract, backupFrequency: number = 1000) {
    super();
    this._data = this.load();
    setInterval(() => {
      this.save();
    }, backupFrequency);
  }

  public getItem<TItem>(key: string, force?: boolean): TItem {
    return this._data[key] ? this._data[key] : null;
  }

  public setItem<TItem>(key: string, value: TItem): number | false {
    this.hasChanges = this.hasChanges || !_.isEqual(this._data[key], value);
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
    const data = _.cloneDeep(this._data);
    this.cleanUpPersistentStorage();

    if (this.hasChanges) {
      this.hasChanges = false;
      for (const key of Object.keys(data)) {
        this.persistentStorage.setItem(key, data[key]);
      }
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
}
