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
  public abstract clear(): void;

  /**
     * Get current storage type
     */
  public abstract type(): CacheStoragesEnum;
}
