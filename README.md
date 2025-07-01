# AutoCache

`AutoCache` is a utility designed to automatically manage caching for specified methods within an object. It supports method-level caching with customizable time-to-live (TTL) settings and provides hooks for additional processing after cache retrieval or method execution.

The primary classes and functions included are `AutoCache` and `withAutoCache`, which facilitate seamless integration of caching mechanisms into your existing codebase.

## Installation

Install the package using your package manager:

```bash
npm i @raphaabreu/nestjs-auto-cache
```

## Using `withAutoCache`

To use, import the `withAutoCache` function into your module and provide the necessary options. You can wrap any object that contains methods you want to cache.

```typescript
import { withAutoCache } from '@raphaabreu/nestjs-auto-cache';

// Sample service, this can be any internal service or API client
class ExampleService {
  private dataStore: Map<string, string>;

  constructor() {
    this.dataStore = new Map();
  }

  async getData(id: string): Promise<string> {
    // Simulate a data retrieval process
    const data = this.dataStore.get(id);
    if (!data) {
      throw new {
        message: `No data found for id: ${id}`
        status: 404
      };
    }
    return data;
  }

  async updateData(id: string, value: string): Promise<void> {
    // Simulate modifying data
    this.dataStore.set(id, value);
  }
}

@Module({
  providers: [
    InMemoryCache,
    {
      provide: ExampleService,
      inject: [InMemoryCache]
      useFactory: (inMemoryCache: InMemoryCache) =>
        withAutoCache(
          new ExampleService(),
          inMemoryCache,
          {
            getData: {
              // Provides a custom TTL function so that we can cache all ids that are found and also that are not found.
              ttl: (result) =>
                result.value || result.error.status === 404 ? 5 * 60 : -1,
            },
            updateData: {
              // Removes the item from the getData method cache when an update happens.
              after(result, id) {
                this.for('getData').remove(id);
              },
            }
          }
        ),
    },
  ],
})
export class YourModule {}
```

### Options

The `withAutoCache` function accepts the following options to configure caching behavior for methods:

- `ttl`: Time-to-live in seconds for the cache entry. It can be a number or a function that returns a number based on the method's result.
- `after`: A function to be called after the method execution, whether the result is from the cache or freshly computed.
- `buildKey`: A function to build the cache key based on method arguments. Defaults to a function that concatenates method name and arguments.
- `allowInfiniteCaching`: A boolean indicating whether to allow infinite caching (ttl=0). Defaults to false.

## Advanced use

### Manipulating the cache

You can manipulate the cache by accessing the `autoCache` property that is added to the class being wrapped.

```typescript
@Injectable()
export class CacheInvalidationService {
  private readonly exampleService: WithAutoCache<ExampleService>;

  constructor(exampleService: ExampleService) {
    this.exampleService = exampleService as WithAutoCache<ExampleService>;
  }

  async invalidate(id: string) {
    await this.exampleService.autoCache.for('getData').remove(id);
  }

  async set(id: string, value: string) {
    await this.exampleService.autoCache.for('getData').set(id, value);
  }
}
```

### Bypassing the auto cache

You can dynamically bypass the cache by accessing the `noCache` property.

```typescript
@Injectable()
export class QueryService {
  private readonly exampleService: WithAutoCache<ExampleService>;

  constructor(exampleService: ExampleService) {
    this.exampleService = exampleService as WithAutoCache<ExampleService>;
  }

  async fetch(id: string, bypassCache = false) {
    if (bypassCache) {
      // The `noCache` property holds a reference to the original object that was wrapped.
      return await this.exampleService.noCache.getData(id);
    }

    // The default method will use the cache.
    return await this.exampleService.getData(id);
  }
}
```

## Using NodeCacheAdapter

`NodeCacheAdapter` is an in-memory cache implementation based on the popular [node-cache](https://www.npmjs.com/package/node-cache) library. It implements the `CacheInterface` and can be used as a drop-in replacement for `InMemoryCache`.

### Installation

`node-cache` is an optional dependency. If you want to use `NodeCacheAdapter`, install it:

```bash
npm install node-cache
```

### Usage Example

```typescript
import { NodeCacheAdapter } from '@raphaabreu/nestjs-auto-cache';
import NodeCache from 'node-cache';

// Create and configure your NodeCache instance
const nodeCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

// Pass it to the adapter
const cache = new NodeCacheAdapter(nodeCache);

await cache.set('key', 'value', 60); // cache for 60 seconds
const value = await cache.get('key');
await cache.remove('key');
```

This approach gives you full control over the NodeCache configuration and ensures type safety.

You can use `NodeCacheAdapter` anywhere a `CacheInterface` is expected, including with `withAutoCache` and other utilities in this package.

## Tests

To run the provided unit tests just execute `npm run tests`.

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Support

If you have any issues or questions, please open an issue on the project repository.
