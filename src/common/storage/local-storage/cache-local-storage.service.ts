import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';
import { SerializeHelper } from '../serialize.helper';

/**
 * Service for storing data in local storage
 */
export class CacheLocalStorage extends CacheStorageAbstract {
  public getItem<TItem>(key: string, force?: boolean): TItem {
    if (!this.isEnabled() && !force) {
      return null;
    }

    const value = localStorage.getItem(key);
    return value ? SerializeHelper.deserialize<TItem>(value) : null;
  }

  public setItem<TItem>(key: string, value: TItem): number | false {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const item = SerializeHelper.serialize(value);

      localStorage.setItem(key, item);
      return item.length;
    } catch (e) {
      this.isEnabled(true);
      return false;
    }
  }

  public removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  public clear() {
    try {
      localStorage.clear();
    } catch {}
  }

  public length() {
    return localStorage.length;
  }

  public key(index: number) {
    return localStorage.key(index);
  }

  public type() {
    return CacheStoragesEnum.LOCAL_STORAGE;
  }

  public isEnabled(check?: boolean) {
    if (check) {
      this.isEnabledValue = undefined;
    }

    const currentDate = new Date();
    if (this.isEnabledValue === undefined || this.isEnabledValueTimestamp < currentDate) {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        this.isEnabledValue = true;
      } catch (e) {
        this.isEnabledValue = false;
      }

      this.isEnabledValueTimestamp = new Date(currentDate.getTime() + this.isEnabledValueTimeout);
    }

    return this.isEnabledValue;
  }
}
