import { CacheInterface, TargetMethod, UnwrapPromise } from './interfaces';
import { ResultCache, ResultCacheOptions } from './result-cache';

export type AutoCacheMethodOptions<TFunction extends (...args: any) => Promise<TReturn>, TReturn> = Omit<
  ResultCacheOptions<TFunction, TReturn>,
  'buildKey'
> & {
  buildKey?: ResultCacheOptions<TFunction, TReturn>['buildKey'];

  allowInfiniteCaching?: boolean;
};

export type AutoCacheMethods<TTarget extends object> = {
  [K in keyof TTarget]?: TTarget[K] extends (...args: any) => Promise<infer U>
    ? AutoCacheMethodOptions<TTarget[K], U>
    : never;
};

export class AutoCache<TTarget extends object> {
  public methods: Map<keyof TTarget, ResultCache<any, any>> = new Map();

  constructor(
    public readonly target: TTarget,
    public readonly cache: CacheInterface<unknown>,
    public readonly methodOptions: AutoCacheMethods<TTarget>,
  ) {
    const targetName = target.constructor.name;

    for (const method in methodOptions) {
      if (!methodOptions.hasOwnProperty(method)) {
        continue;
      }

      const originalOpts = methodOptions[method];
      const opts = {
        ...originalOpts,

        // If the buildKey is not defined, we will use a default one
        buildKey:
          originalOpts.buildKey ||
          ((...args: any) => `${targetName}:${method}:${[...args.map((p) => String(p))].join(':')}`),
      };

      // Ensuring the ttl is valid
      const ttl = opts.ttl;
      if (typeof ttl === 'number') {
        this.validateTtl(ttl, opts.allowInfiniteCaching);
      } else {
        opts.ttl = (result) => {
          const calculatedTtl = ttl(result);
          this.validateTtl(calculatedTtl, opts.allowInfiniteCaching);
          return calculatedTtl;
        };
      }

      this.methods.set(method, new ResultCache(cache, opts));
    }
  }

  for<K extends keyof TTarget>(
    method: K,
  ): ResultCache<TargetMethod<TTarget, K>, UnwrapPromise<ReturnType<TargetMethod<TTarget, K>>>> {
    const methodCache = this.methods.get(method);

    if (!methodCache) {
      throw new Error(`Method ${methodCache} not configured in AutoCache.`);
    }

    return methodCache;
  }

  private validateTtl(ttl: number, allowInfiniteCaching: boolean) {
    if (ttl === 0 && !allowInfiniteCaching) {
      throw new Error(
        `Method does not allow infinite caching. You can set allowInfiniteCaching to 'true' if you really want to, but in general terms all caches should have a ttl to auto expire.`,
      );
    }
  }
}
