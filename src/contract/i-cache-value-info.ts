export interface ICacheValueInfo<TEntity> {
  value: TEntity;
  validForCache: boolean;
  validForPreload: boolean;
}
