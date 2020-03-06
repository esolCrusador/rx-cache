import { CacheStoragesEnum } from '../../contract/cache-storages.enum';

/**
 * Abstract cache storage
 */
export abstract class CacheStorageAbstract {
  protected isEnabledValue: boolean;
  protected isEnabledValueTimestamp: Date;
  protected readonly isEnabledValueTimeout: number = 10000;

  /**
   * Check if storage is enabled
   */
  public abstract isEnabled(check?: boolean): boolean;

  /**
   * Get item from storage
   * @param key
   */
  public abstract getItem<TItem>(key: string, force?: boolean): TItem;

  /**
   * Set item to storage
   * @param key
   * @param value
   */
  public abstract setItem<TItem>(key: string, value: TItem): number | false;

  /**
   * Remove item from storage
   * @param key
   */
  public abstract removeItem(key: string): void;

  /**
   * Clear item in storage
   */
  public clear(prefix: string) {
    const keys: string[] = [];

    const length = this.length();
    for (let i = 0; i < length; i++) {
      const key = this.key(i);
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      this.removeItem(key);
    }
  }

  /**
   * Get current storage type
   */
  public abstract type(): CacheStoragesEnum;
  /**
   * Get number of elements in storage type
   */
  public abstract length(): number;
  /**
   * Get indexed key in storage type
   */
  public abstract key(index: number): string | null;

  /**
   * Saves data into persisted storage (selected by default)
   */
  public abstract persist(): void;

  /**
   * Unsave data into persisted storage (selected by default)
   */
  public abstract unpersist(prefix: string): void;
}
