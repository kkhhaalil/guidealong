/** Minimal in-memory CacheStorage for vitest (jsdom lacks caches). */

export interface MockCache {
  name: string;
  put(key: string, response: Response): Promise<void>;
  match(key: string | Request): Promise<Response | undefined>;
  keys(): Promise<string[]>;
}

export interface MockCacheStorage {
  open(name: string): Promise<MockCache>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
  match(key: string | Request): Promise<Response | undefined>;
}

function reqUrl(key: string | Request): string {
  if (typeof key === 'string') return key;
  return key.url;
}

function createCache(name: string, store: Map<string, Map<string, Response>>): MockCache {
  const bucket = () => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };

  return {
    name,
    async put(key, response) {
      bucket().set(reqUrl(key), response);
    },
    async match(key) {
      return bucket().get(reqUrl(key));
    },
    async keys() {
      return [...bucket().keys()];
    },
  };
}

export function createMockCacheStorage(): MockCacheStorage {
  const store = new Map<string, Map<string, Response>>();

  return {
    async open(name) {
      return createCache(name, store);
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name) {
      return store.delete(name);
    },
    async match(key) {
      const url = reqUrl(key);
      for (const bucket of store.values()) {
        const hit = bucket.get(url);
        if (hit) return hit;
      }
      return undefined;
    },
  };
}
