import { withAutoCache, WithAutoCacheMethods, WithAutoCache } from './with-auto-cache';
import { CacheInterface } from './interfaces';
import { AutoCache } from './auto-cache';

describe('withAutoCache', () => {
  let target: any;
  let cache: CacheInterface<unknown>;
  let methodOptions: WithAutoCacheMethods<any>;
  let proxy: WithAutoCache<any>;

  beforeEach(() => {
    target = {
      async methodA(arg: string): Promise<string> {
        return `Hello ${arg}`;
      },
      async methodB(arg: number): Promise<number> {
        return arg * 2;
      },
      async methodC(arg: number): Promise<number> {
        return arg * 3;
      },
      async methodD(arg: number): Promise<number> {
        return arg * 4;
      },

      propA: 'propA',
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
      },
      methodC: {
        after: jest.fn(),
      },
    };

    proxy = withAutoCache(target, cache, methodOptions);
  });

  describe('noCache', () => {
    it('should return the original target', () => {
      // Arrange & Act
      const noCacheTarget = proxy.noCache;

      // Assert
      expect(noCacheTarget).toBe(target);
    });
  });

  describe('autoCache', () => {
    it('should return the AutoCache instance', () => {
      // Arrange & Act
      const autoCacheInstance = proxy.autoCache;

      // Assert
      expect(autoCacheInstance).toBeInstanceOf(AutoCache);
    });
  });

  it('should call the original method if no cache is configured', async () => {
    // Arrange
    const arg = 'world';
    const expectedValue = `Hello ${arg}`;

    // Act
    const result = await proxy.methodA(arg);

    // Assert
    expect(result).toBe(expectedValue);
    expect(cache.get).toHaveBeenCalledTimes(0);
  });

  it('should return cached result if available', async () => {
    // Arrange
    const arg = 'world';
    const expectedValue = `Hello ${arg}`;
    const cachedResult = { value: expectedValue };
    (cache.get as jest.Mock).mockResolvedValue(cachedResult);

    // Act
    const result = await proxy.methodA(arg);

    // Assert
    expect(result).toBe(expectedValue);
    expect(cache.get).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalledTimes(0);
  });

  it('should throw cached result if available', async () => {
    // Arrange
    const arg = 'world';
    const cachedResult = { error: new Error('Test error') };
    (cache.get as jest.Mock).mockResolvedValue(cachedResult);

    // Act
    const promise = proxy.methodA(arg);

    // Assert
    await expect(promise).rejects.toThrow('Test error');
    expect(cache.get).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalledTimes(0);
  });

  it('should call the original method if no cached result is available', async () => {
    // Arrange
    const arg = 'world';
    const expectedValue = `Hello ${arg}`;
    (cache.get as jest.Mock).mockResolvedValue(null);

    // Act
    const result = await proxy.methodA(arg);

    // Assert
    expect(result).toBe(expectedValue);
    expect(cache.get).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
  });

  it('should call the after function if provided', async () => {
    // Arrange
    const arg = 5;
    const expectedValue = arg * 2;
    (cache.get as jest.Mock).mockResolvedValue(null);

    // Act
    const result = await proxy.methodC(arg);

    // Assert
    expect(result).toBe(expectedValue);
    expect(methodOptions.methodC?.after).toHaveBeenCalled();
  });

  it('should throw an error if the original method throws', async () => {
    // Arrange
    const arg = 'error';
    const error = new Error('Test error');
    target.methodA = jest.fn().mockRejectedValue(error);

    // Act & Assert
    await expect(proxy.methodA(arg)).rejects.toThrow(error);
    expect(cache.set).toHaveBeenCalledWith(expect.any(String), { error });
  });

  it('should cache the result if the original method succeeds', async () => {
    // Arrange
    const arg = 'world';
    const expectedValue = `Hello ${arg}`;
    (cache.get as jest.Mock).mockResolvedValue(null);

    // Act
    const result = await proxy.methodA(arg);

    // Assert
    expect(result).toBe(expectedValue);
    expect(cache.set).toHaveBeenCalledWith(expect.any(String), { value: expectedValue });
  });

  it('should prevent multiple calls to the same method with the same arguments', async () => {
    // Arrange
    const arg = 'world';
    const expectedValue = `Hello ${arg}`;
    (cache.get as jest.Mock).mockResolvedValue(null);
    const spy = jest.spyOn(target, 'methodA');

    // Act
    const promise1 = proxy.methodA(arg);
    const promise2 = proxy.methodA(arg);

    // Assert
    await expect(promise1).resolves.toBe(expectedValue);
    await expect(promise2).resolves.toBe(expectedValue);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not proxy properties', () => {
    // Arrange
    const propA = proxy.propA;

    // Act & Assert
    expect(propA).toBe(target.propA);
  });

  it('should not proxy methods that are not configured', async () => {
    // Arrange
    const arg = 5;
    const expectedValue = arg * 4;
    (cache.get as jest.Mock).mockResolvedValue(null);

    // Act
    const result = await proxy.methodD(arg);

    // Assert
    expect(result).toBe(expectedValue);
    expect(cache.get).toHaveBeenCalledTimes(0);
  });
});
