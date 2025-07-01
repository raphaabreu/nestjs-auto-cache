import { CacheInterface } from './interfaces';

// Type-only import for validation
type NodeCacheType = any;

export class NodeCacheAdapter<TValue> implements CacheInterface<TValue> {
    private cache: NodeCacheType;

    constructor(nodeCacheInstance: NodeCacheType) {
        if (!nodeCacheInstance || typeof nodeCacheInstance.get !== 'function') {
            throw new Error('Invalid NodeCache instance provided');
        }
        this.cache = nodeCacheInstance;
    }

    async get(key: string): Promise<TValue> {
        return this.cache.get(key) as TValue;
    }

    async set(key: string, value: TValue, ttl: number): Promise<void> {
        this.cache.set(key, value, ttl);
    }

    async remove(key: string): Promise<void> {
        this.cache.del(key);
    }
} 