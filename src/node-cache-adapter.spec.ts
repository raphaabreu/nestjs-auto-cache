import { NodeCacheAdapter } from './node-cache-adapter';
import NodeCache from 'node-cache';

describe('NodeCacheAdapter', () => {
    let cache: NodeCacheAdapter<any>;
    let nodeCache: NodeCache;

    beforeEach(() => {
        nodeCache = new NodeCache();
        cache = new NodeCacheAdapter(nodeCache);
    });

    it('should set and get a value', async () => {
        await cache.set('foo', 'bar', 10);
        const value = await cache.get('foo');
        expect(value).toBe('bar');
    });

    it('should return undefined for missing key', async () => {
        const value = await cache.get('missing');
        expect(value).toBeUndefined();
    });

    it('should remove a value', async () => {
        await cache.set('foo', 'bar', 10);
        await cache.remove('foo');
        const value = await cache.get('foo');
        expect(value).toBeUndefined();
    });

    it('should expire values after ttl', async () => {
        await cache.set('foo', 'bar', 1); // 1 second TTL
        await new Promise((r) => setTimeout(r, 1100));
        const value = await cache.get('foo');
        expect(value).toBeUndefined();
    });

    it('should throw error for invalid instance', () => {
        expect(() => new NodeCacheAdapter(null as any)).toThrow('Invalid NodeCache instance provided');
        expect(() => new NodeCacheAdapter({} as any)).toThrow('Invalid NodeCache instance provided');
    });
}); 