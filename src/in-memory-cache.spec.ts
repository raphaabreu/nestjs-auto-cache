import { InMemoryCache } from './in-memory-cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache<any>;

  beforeEach(() => {
    cache = new InMemoryCache();
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
    jest.spyOn(global, 'clearInterval');
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('get', () => {
    it('should return null if the key does not exist', async () => {
      // Arrange
      const key = 'nonExistentKey';

      // Act
      const result = await cache.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if the cached entry has expired', async () => {
      // Arrange
      const key = 'expiredKey';
      const value = { data: 'testValue' };
      await cache.set(key, value, -1); // TTL is negative, so it should be expired immediately

      // Act
      const result = await cache.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should return the cached value if it exists and is not expired', async () => {
      // Arrange
      const key = 'validKey';
      const value = { data: 'testValue' };
      await cache.set(key, value, 60); // TTL is 60 seconds

      // Act
      const result = await cache.get(key);

      // Assert
      expect(result).toEqual(value);
    });
  });

  describe('set', () => {
    it('should store the value with the correct TTL', async () => {
      // Arrange
      const key = 'testKey';
      const value = { data: 'testValue' };
      const ttl = 60; // 60 seconds

      // Act
      await cache.set(key, value, ttl);
      const result = await cache.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should store the value indefinitely if TTL is zero', async () => {
      // Arrange
      const key = 'indefiniteKey';
      const value = { data: 'testValue' };

      // Act
      await cache.set(key, value, 0);
      const result = await cache.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should not store the value if TTL is negative', async () => {
      // Arrange
      const key = 'indefiniteKey';
      const value = { data: 'testValue' };

      // Act
      await cache.set(key, value, -1);
      const result = await cache.get(key);

      // Assert
      expect(result).toEqual(null);
    });
  });

  describe('remove', () => {
    it('should remove the cached entry', async () => {
      // Arrange
      const key = 'removalKey';
      const value = { data: 'testValue' };
      await cache.set(key, value, 60);

      // Act
      await cache.remove(key);
      const result = await cache.get(key);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('onModuleInit', () => {
    it('should start the cleanup interval', () => {
      // Arrange

      // Act
      cache.onModuleInit();

      // Assert
      expect(setInterval).toHaveBeenCalledTimes(1);
    });

    it('should not start the cleanup interval if already started', () => {
      // Arrange
      cache.onModuleInit();

      // Act
      cache.onModuleInit();

      // Assert
      expect(setInterval).toHaveBeenCalledTimes(1);
    });

    it('should remove expired entries during cleanup', () => {
      // Arrange
      const key = 'expiredKey';
      const value = { data: 'testValue' };
      const ttl = -1; // expired immediately
      cache.set(key, value, ttl);
      cache.onModuleInit();

      // Act
      jest.advanceTimersByTime(60000); // 60,000 milliseconds = 1 minute

      // Assert
      expect(cache.get(key)).resolves.toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop the cleanup interval', () => {
      // Arrange
      cache.onModuleInit();
      expect(setInterval).toHaveBeenCalledTimes(1);

      // Act
      cache.onModuleDestroy();

      // Assert
      expect(clearInterval).toHaveBeenCalledTimes(1);
    });

    it('should not throw if cleanup interval was never started', () => {
      // Arrange

      // Act
      const stopCleanup = () => cache.onModuleDestroy();

      // Assert
      expect(stopCleanup).not.toThrow();
    });
  });
});
