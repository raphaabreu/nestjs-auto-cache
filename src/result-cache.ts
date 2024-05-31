import { StructuredLogger } from '@raphaabreu/nestjs-opensearch-structured-logger';
import { CacheInterface } from './interfaces';

export type ResultCacheOptions<TFunction extends (...args: any) => Promise<TReturn>, TReturn> = {
  buildKey: (...args: Parameters<TFunction>) => string;

  /**
   * Time to live in seconds for the cache entry. If a function is provided, it will be called with the result of the function call.
   *
   * Possible returns:
   * * positive number: the cache entry will expire in the given number of seconds
   * * zero: the cache entry will not expire
   * * negative number: the cache entry will not be stored
   */
  ttl: number | ((result: Result<TReturn>) => number);
};

export type Result<TValue, TError = any> = {
  value?: TValue;
  error?: TError;
};

export type ResultCacheEvents<TReturn> = {
  get: (key: string, result: Result<TReturn>) => void;
  set: (key: string, result: Result<TReturn>, ttl: number) => void;
  remove: (key: string) => void;
};

export class ResultCache<TFunction extends (...args) => any, TReturn> {
  private static logger = new StructuredLogger(ResultCache.name);

  constructor(
    private readonly cache: CacheInterface<Result<TReturn>>,
    private readonly options: ResultCacheOptions<TFunction, TReturn>,
  ) {}

  public buildKey(...args: Parameters<TFunction>) {
    return this.options.buildKey(...args);
  }

  public async get(...args: Parameters<TFunction>): Promise<Result<TReturn>> {
    const key = this.buildKey(...args);
    const result = await this.cache.get(key);

    ResultCache.logger
      .createScope({ result: JSON.stringify(result) })
      .debug(result ? 'Loaded key ${key} from cache' : 'Key ${key} not found in cache', key);

    return result;
  }

  public async set(result: Result<TReturn>, ...args: Parameters<TFunction>) {
    const ttl = this.calculateTtl(result);

    // There is nothing to do if the ttl is not zero or positive
    if (!(ttl >= 0)) {
      return;
    }

    const key = this.buildKey(...args);

    await this.cache.set(key, result, ttl);

    ResultCache.logger
      .createScope({ result: JSON.stringify(result) })
      .debug('Saved key ${key} to cache with ttl ${ttl}', key, ttl);
  }

  public async remove(...args: Parameters<TFunction>) {
    const key = this.buildKey(...args);
    await this.cache.remove(key);
    ResultCache.logger.debug('Removed key ${key} from cache', key);
  }

  private calculateTtl(result: Result<TReturn>): number {
    if (this.options.ttl instanceof Function) {
      return this.options.ttl(result);
    }

    if (result.error) {
      return -1;
    }

    return this.options.ttl;
  }
}
