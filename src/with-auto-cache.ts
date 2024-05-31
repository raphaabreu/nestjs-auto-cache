import { AutoCache, AutoCacheMethodOptions, AutoCacheMethods } from './auto-cache';
import { CacheInterface } from './interfaces';
import { Result } from './result-cache';

export type PossiblyCachedResult<TValue, TError = any> = Result<TValue, TError> & {
  cached: boolean;
};

export type WithAutoCacheMethodOptions<
  TTarget extends object,
  TFunction extends (...args: any) => Promise<TReturn>,
  TReturn,
> = Omit<AutoCacheMethodOptions<TFunction, TReturn>, 'ttl'> & {
  ttl?: AutoCacheMethodOptions<TFunction, TReturn>['ttl'];

  after?(
    this: AutoCache<TTarget>,
    result: PossiblyCachedResult<TReturn>,
    ...args: Parameters<TFunction>
  ): Promise<void> | void;
};

export type WithAutoCacheMethods<TTarget extends object> = {
  [K in keyof TTarget]?: TTarget[K] extends (...args: any) => Promise<infer U>
    ? WithAutoCacheMethodOptions<TTarget, TTarget[K], U>
    : never;
};

export type WithAutoCache<TTarget extends object> = {
  noCache: TTarget;
  autoCache: AutoCache<TTarget>;
} & TTarget;

export function withAutoCache<TTarget extends object>(
  target: TTarget,
  cache: CacheInterface<unknown>,
  methodOptions: WithAutoCacheMethods<TTarget>,
) {
  // Filters the methods that have ttl defined to configure the AutoCache
  const autoCacheOptions = Object.getOwnPropertyNames(methodOptions).reduce((acc, key) => {
    const opts = methodOptions[key];
    if (opts.ttl) {
      acc[key] = opts;
    }
    return acc;
  }, {} as AutoCacheMethods<TTarget>);

  const autoCache = new AutoCache(target, cache, autoCacheOptions);

  // This cache is used to prevent multiple calls to the same method with the same arguments
  const upstreamCallCache = new Map<string, Promise<any>>();

  const proxy = new Proxy(target, {
    get(targetObject, prop, receiver) {
      const origMethod = targetObject[prop];

      // Returning values that will make the target adhere to the WithAutoCache type
      if (prop === 'noCache') {
        return targetObject;
      }
      if (prop === 'autoCache') {
        return autoCache;
      }

      // Check if the property needs to be wrapped
      const needsToWrap = typeof prop === 'string' && Object.getOwnPropertyNames(methodOptions).includes(prop);

      // Get the cache for the method
      const methodCache = autoCache.methods.get(prop as keyof TTarget);

      // If the property is a method that has cache options, we will wrap it
      if (typeof origMethod !== 'function' || !needsToWrap) {
        return Reflect.get(targetObject, prop, receiver);
      }

      const propOptions = methodOptions[prop] as WithAutoCacheMethodOptions<TTarget, any, any>;

      return async function (...args: Parameters<TTarget[never]>) {
        const after = async (result: PossiblyCachedResult<unknown>, ...originalArgs: unknown[]) => {
          const afterFn = propOptions.after;
          if (afterFn) {
            await afterFn.call(autoCache, result, ...originalArgs);
          }
        };

        // If the method does not have a cache, we will call the original method
        if (!methodCache) {
          const value = await origMethod.apply(this, args);
          await after({ value, cached: false }, ...args);
          return value;
        }

        // Checking if the result is already cached
        const cachedResult = await methodCache.get(...args);

        // If the result is cached, we will return it
        if (cachedResult) {
          await after({ ...cachedResult, cached: true }, ...args);
          if (cachedResult.error) {
            throw cachedResult.error;
          }
          return cachedResult.value;
        }

        // Checking if there is a call in progress
        const key = methodCache.buildKey(...args);
        const cachedCall = upstreamCallCache.get(key);
        if (cachedCall) {
          // If there is a call in progress, we will wait for it to finish
          return await cachedCall;
        }

        // Defining the function that will load the data from the upstream
        const loadFromUpstream = async (...originalArgs: Parameters<TTarget[never]>) => {
          try {
            const value = await origMethod.apply(this, originalArgs);
            await methodCache.set({ value }, ...originalArgs);
            await after({ value, cached: false }, ...originalArgs);
            return value;
          } catch (error) {
            await methodCache.set({ error }, ...originalArgs);
            await after({ error, cached: false }, ...originalArgs);
            throw error;
          }
        };

        // If there is no call in progress, we will start a new one
        try {
          const call = loadFromUpstream(...args);
          // We need to store the call in the cache to prevent multiple calls with the same arguments
          upstreamCallCache.set(key, call);
          const result = await call;
          return result;
        } finally {
          // After the call is finished, we need to remove it from the cache
          upstreamCallCache.delete(key);
        }
      };
    },
  });

  return proxy as WithAutoCache<TTarget>;
}
