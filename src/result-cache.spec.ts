import { CacheInterface } from './interfaces';
import { ResultCache, ResultCacheOptions, Result } from './result-cache';

describe('ResultCache', () => {
  let cache: CacheInterface<Result<any>>;
  let options: ResultCacheOptions<(...args: any[]) => Promise<any>, any>;
  let resultCache: ResultCache<(...args: any[]) => Promise<any>, any>;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    };

    options = {
      buildKey: jest.fn().mockImplementation((...args) => JSON.stringify(args)),
      ttl: 60,
    };

    resultCache = new ResultCache(cache, options);
  });

  describe('buildKey', () => {
    it('should call buildKey with the provided arguments', () => {
      // Arrange
      const args = [1, 2, 3];
      const expectedKey = JSON.stringify(args);

      // Act
      const result = resultCache.buildKey(...args);

      // Assert
      expect(result).toBe(expectedKey);
      expect(options.buildKey).toHaveBeenCalledWith(...args);
    });
  });

  describe('get', () => {
    it('should return the cached result if available', async () => {
      // Arrange
      const args = [1, 2, 3];
      const key = JSON.stringify(args);
      const cachedResult = { value: 'test' };
      (cache.get as jest.Mock).mockResolvedValue(cachedResult);

      // Act
      const result = await resultCache.get(...args);

      // Assert
      expect(cache.get).toHaveBeenCalledWith(key);
      expect(result).toBe(cachedResult);
    });
  });

  describe('set', () => {
    it('should set the cache with the result if ttl is positive', async () => {
      // Arrange
      const args = [1, 2, 3];
      const key = JSON.stringify(args);
      const result = { value: 'test' };
      const ttl = 60;

      jest.spyOn(resultCache as any, 'calculateTtl').mockReturnValue(ttl);

      // Act
      await resultCache.set(result, ...args);

      // Assert
      expect(cache.set).toHaveBeenCalledWith(key, result, ttl);
    });

    it('should not set the cache if ttl is negative', async () => {
      // Arrange
      const args = [1, 2, 3];
      const result = { value: 'test' };
      const ttl = -1;

      jest.spyOn(resultCache as any, 'calculateTtl').mockReturnValue(ttl);

      // Act
      await resultCache.set(result, ...args);

      // Assert
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove the cached entry', async () => {
      // Arrange
      const args = [1, 2, 3];
      const key = JSON.stringify(args);

      // Act
      await resultCache.remove(...args);

      // Assert
      expect(cache.remove).toHaveBeenCalledWith(key);
    });
  });

  describe('calculateTtl', () => {
    it('should return the ttl from options if it is a number', () => {
      // Arrange
      const result = { value: 'test' };
      options.ttl = 60;

      // Act
      const ttl = (resultCache as any).calculateTtl(result);

      // Assert
      expect(ttl).toBe(60);
    });

    it('should call the ttl function with the result if ttl is a function', () => {
      // Arrange
      const result = { value: 'test' };
      options.ttl = (r) => 123;

      // Act
      const ttl = (resultCache as any).calculateTtl(result);

      // Assert
      expect(ttl).toBe(123);
    });

    it('should return -1 if the result contains an error', () => {
      // Arrange
      const result = { error: 'error' };
      options.ttl = 60;

      // Act
      const ttl = (resultCache as any).calculateTtl(result);

      // Assert
      expect(ttl).toBe(-1);
    });
  });
});
