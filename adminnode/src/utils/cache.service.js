
/**
 * Simple in-memory cache service
 * @todo Replace with Redis for distributed caching in production
 */
class CacheService {
    constructor() {
        this.cache = new Map();
        this.ttl = 3600 * 1000; // Default TTL: 1 hour
    }

    /**
     * Get value from cache
     * @param {string} key 
     * @returns {any|null}
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Set value in cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttlMs (Optional) Time to live in ms
     */
    set(key, value, ttlMs = null) {
        const expiry = Date.now() + (ttlMs || this.ttl);
        this.cache.set(key, { value, expiry });
    }

    /**
     * Delete value from cache
     * @param {string} key 
     */
    del(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }
}

module.exports = new CacheService();
