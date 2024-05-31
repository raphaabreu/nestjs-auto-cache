import { CacheInterface } from './interfaces';
import { ResultCache } from './result-cache';
import { AutoCache, AutoCacheMethods } from './auto-cache';

describe('AutoCache', () => {
  let target: any;
  let cache: CacheInterface<unknown>;
  let methodOptions: AutoCacheMethods<any>;
  let autoCache: AutoCache<any>;

  beforeEach(() => {
    target = {
      async methodA(arg: string): Promise<string> {
        return `Hello ${arg}`;
      },
      async methodB(arg: number): Promise<number> {
        return arg * 2;
      },
    };

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    };

    methodOptions = {
      methodA: {
        ttl: 60,
      },
      methodB: {
        ttl: (result) => Number(result.value) * 2,
        allowInfiniteCaching: true,
      },
    };

    autoCache = new AutoCache(target, cache, methodOptions);
  });

  describe('constructor', () => {
    it('should create ResultCache instances for each method', () => {
      // Arrange
      const methods = Array.from(autoCache.methods.keys());
      const hasMethodA = methods.includes('methodA');
      const hasMethodB = methods.includes('methodB');

      // Act

      // Assert
      expect(hasMethodA).toBe(true);
      expect(hasMethodB).toBe(true);
    });

    it('should use the default buildKey if none is provided', () => {
      // Arrange
      const methodCache = autoCache.methods.get('methodA');

      // Act

      // Assert
      expect(methodCache).toBeDefined();
      expect(methodCache.buildKey('test')).toBe('Object:methodA:test');
    });

    it('should validate ttl if it is a number', () => {
      // Arrange
      const validateTtlSpy = jest.spyOn(AutoCache.prototype as any, 'validateTtl');

      // Act
      const _ = new AutoCache(target, cache, methodOptions);

      // Assert
      expect(validateTtlSpy).toHaveBeenCalledWith(60, undefined);
    });

    it('should validate ttl if it is a function', () => {
      // Arrange
      const validateTtlSpy = jest.spyOn(AutoCache.prototype as any, 'validateTtl');
      const autoCache = new AutoCache(target, cache, methodOptions);

      // Act
      autoCache.for('methodB').set({ value: 123 }, 'test');

      // Assert
      expect(validateTtlSpy).toHaveBeenCalledWith(60, undefined);
      expect(validateTtlSpy).toHaveBeenCalledWith(123 * 2, true);
    });
  });

  describe('for', () => {
    it('should return the ResultCache instance for the specified method', () => {
      // Arrange
      const method = 'methodA';

      // Act
      const methodCache = autoCache.for(method);

      // Assert
      expect(methodCache).toBeInstanceOf(ResultCache);
    });

    it('should throw an error if the method is not configured in AutoCache', () => {
      // Arrange
      const method = 'nonExistentMethod';

      // Act & Assert
      expect(() => autoCache.for(method)).toThrow(`Method undefined not configured in AutoCache.`);
    });
  });

  describe('validateTtl', () => {
    it('should throw an error if ttl is 0 and allowInfiniteCaching is false', () => {
      // Arrange
      const ttl = 0;
      const allowInfiniteCaching = false;

      // Act & Assert
      expect(() => (autoCache as any).validateTtl(ttl, allowInfiniteCaching)).toThrow(
        `Method does not allow infinite caching. You can set allowInfiniteCaching to 'true' if you really want to, but in general terms all caches should have a ttl to auto expire.`,
      );
    });

    it('should not throw an error if ttl is 0 and allowInfiniteCaching is true', () => {
      // Arrange
      const ttl = 0;
      const allowInfiniteCaching = true;

      // Act & Assert
      expect(() => (autoCache as any).validateTtl(ttl, allowInfiniteCaching)).not.toThrow();
    });

    it('should not throw an error if ttl is positive', () => {
      // Arrange
      const ttl = 60;
      const allowInfiniteCaching = false;

      // Act & Assert
      expect(() => (autoCache as any).validateTtl(ttl, allowInfiniteCaching)).not.toThrow();
    });
  });
});
