import { Duration } from 'moment';

export interface ICacheOptions {
  /**
   * Preload max age in seconds
   */
  preloadMaxAge?: Duration;

  /**
   * Cache max age in seconds
   */
  cacheMaxAge?: Duration;

  /**
   * Tag for this key
   */
  tag?: string;
}
