import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';

/**
 * Service for storing data in local storage
 */
export class CacheMemoryStorage extends CacheStorageAbstract {

  private _data: { [key: string]: any } = {};

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
    return CacheStoragesEnum.MEMORY;
  }

  public isEnabled(check?: boolean) {
    return true;
  }
}
