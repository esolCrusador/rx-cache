import { InjectionToken } from '@angular/core';

export interface ICacheLogger {
  error(error: string): void;
}

export const I_CACHE_LOGGER = new InjectionToken<ICacheLogger>('ICacheLogger');
