import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

export interface StorageProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

class FileStorage implements StorageProvider {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || join(process.cwd(), 'data');
  }

  private filePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_:-]/g, '_');
    return join(this.basePath, safeKey);
  }

  async get(key: string): Promise<string | null> {
    const primary = this.filePath(key);
    const fallback = join('/tmp', `lurelit_${key.replace(/[^a-zA-Z0-9_:-]/g, '_')}`);

    for (const p of [primary, fallback]) {
      if (!existsSync(p)) continue;
      try {
        const content = readFileSync(p, 'utf8');
        if (!content) continue;
        return content;
      } catch {
        continue;
      }
    }
    return null;
  }

  async set(key: string, value: string): Promise<void> {
    const primary = this.filePath(key);
    const fallback = join('/tmp', `lurelit_${key.replace(/[^a-zA-Z0-9_:-]/g, '_')}`);

    try {
      const dir = dirname(primary);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(primary, value, 'utf8');
    } catch {
      try {
        writeFileSync(fallback, value, 'utf8');
        console.warn(`[Lurelit] Could not write to ${primary}, saved to ${fallback}`);
      } catch (e) {
        throw new Error(`Cannot write storage key "${key}": ${e}`);
      }
    }
  }

  async del(key: string): Promise<void> {
    const primary = this.filePath(key);
    const fallback = join('/tmp', `lurelit_${key.replace(/[^a-zA-Z0-9_:-]/g, '_')}`);

    for (const p of [primary, fallback]) {
      try {
        if (existsSync(p)) unlinkSync(p);
      } catch {
        // ignore
      }
    }
  }
}

class RedisStorage implements StorageProvider {
  private redis: import('@upstash/redis').Redis | null = null;

  private async getClient() {
    if (!this.redis) {
      const { Redis } = await import('@upstash/redis');
      this.redis = Redis.fromEnv();
    }
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    const value = await client.get<string>(`lurelit:${key}`);
    return value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const client = await this.getClient();
    await client.set(`lurelit:${key}`, value);
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`lurelit:${key}`);
  }
}

let _storage: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_storage) return _storage;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _storage = new RedisStorage();
  } else {
    _storage = new FileStorage();
  }

  return _storage;
}
