import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';
import * as _ from 'lodash';
import { CacheLocalStorage } from '@cache/common/storage/local-storage/cache-local-storage.service';

/**
 * Service for storing data in local storage
 */
export class CacheHybridStorage extends CacheStorageAbstract {
  private _data: { [key: string]: any } = {};
  private persistentStorage: CacheLocalStorage = new CacheLocalStorage();

  constructor(private readonly cachePrefix: string, backupFrequency: number = 30000) {
    super();
    this._data = this.load();
    setTimeout(() => {
      this.save();
    }, backupFrequency);
  }

  public getItem<TItem>(key: string, force?: boolean): TItem {
    return this._data[key] ? this._data[key] : null;
  }

  public setItem<TItem>(key: string, value: TItem): number | false {
    this._data[key] = value;
    return 1;
  }

  public removeItem(key: string) {
    delete this._data[key];
  }

  public clear() {
    this._data = [];
  }

  public type() {
    return CacheStoragesEnum.HYBRID;
  }

  public isEnabled(check?: boolean) {
    return true;
  }

  public save() {
    const data = _.cloneDeep(this._data);

    for (const key of Object.keys(data)) {
      this.persistentStorage.setItem(key, data[key]);
    }
  }

  public load(): { [key: string]: any } {
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
