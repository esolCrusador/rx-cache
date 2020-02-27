import { CacheStorageAbstract } from '../cache-storage-abstract.service';
import { CacheStoragesEnum } from '../../../contract/cache-storages.enum';
import { SerializeHelper } from '../serialize.helper';

/**
 * Service for storing data in session storage
 */
export class CacheSessionStorage extends CacheStorageAbstract {
  public getItem<TItem>(key: string, force: boolean = false) {
    if (!this.isEnabled() && !force) {
      return null;
    }

    const value = sessionStorage.getItem(key);
    return value ? SerializeHelper.deserialize<TItem>(value) : null;
  }

  public setItem<TItem>(key: string, value: TItem): number | false {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const item = SerializeHelper.serialize(value);

      sessionStorage.setItem(key, item);
      return item.length;
    } catch (e) {
      this.isEnabled(true);
      return false;
    }
  }

  public removeItem(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }

  public clear() {
    try {
      sessionStorage.clear();
    } catch {}
  }

  public type() {
    return CacheStoragesEnum.SESSION_STORAGE;
  }

  public isEnabled(check?: boolean) {
    if (check) {
      this.isEnabledValue = undefined;
    }

    const currentDate = new Date();
    if (this.isEnabledValue === undefined || this.isEnabledValueTimestamp < currentDate) {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        this.isEnabledValue = true;
      } catch (e) {
        this.isEnabledValue = false;
      }

      this.isEnabledValueTimestamp = new Date(currentDate.getTime() + this.isEnabledValueTimeout);
    }

    return this.isEnabledValue;
  }

  public length() {
    return sessionStorage.length;
  }

  public key(index: number) {
    return sessionStorage.key(index);
  }
}
