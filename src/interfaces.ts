export interface CacheInterface<TValue> {
  get(key: string): Promise<TValue>;
  set(key: string, value: TValue, ttl: number): Promise<void>;
  remove(key: string): Promise<void>;
}

export type TargetMethod<
  TClient,
  K extends keyof TClient
> = TClient[K] extends (...args: any) => Promise<infer U>
  ? (...args: Parameters<TClient[K]>) => Promise<U>
  : never;

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
