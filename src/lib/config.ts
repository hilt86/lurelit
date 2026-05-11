import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface GlobalConfig {
  kibanaUrl: string;
  workflowId: string;
  huntEnabled: boolean;
}

const CONFIG_PATH = join(process.cwd(), '.smish-config.enc');
const SALT = 'smish-analyzer-v1';

function getEncryptionKey(): Buffer {
  const secret = process.env.CONFIG_SECRET || 'smish-analyzer-default-key-change-me';
  return scryptSync(secret, SALT, 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

function decrypt(data: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function saveGlobalConfig(config: GlobalConfig): void {
  const data = encrypt(JSON.stringify(config));
  try {
    writeFileSync(CONFIG_PATH, data, 'utf8');
  } catch {
    const fallback = join('/tmp', '.smish-config.enc');
    try {
      writeFileSync(fallback, data, 'utf8');
      console.warn(`[Lurelit] Could not write config to ${CONFIG_PATH}, saved to ${fallback}`);
    } catch (e) {
      throw new Error(`Permission denied: cannot write config to ${CONFIG_PATH} or ${fallback}. Ensure the app directory is writable or use KIBANA_URL + WORKFLOW_ID environment variables instead. (${e})`);
    }
  }
}

export function loadGlobalConfig(): GlobalConfig | null {
  if (process.env.KIBANA_URL && process.env.WORKFLOW_ID) {
    return { kibanaUrl: process.env.KIBANA_URL, workflowId: process.env.WORKFLOW_ID, huntEnabled: true };
  }

  const paths = [CONFIG_PATH, join('/tmp', '.smish-config.enc')];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const json = decrypt(readFileSync(p, 'utf8'));
      const parsed = JSON.parse(json);
      return { huntEnabled: true, ...parsed } as GlobalConfig;
    } catch {
      continue;
    }
  }
  return null;
}

export function clearGlobalConfig(): void {
  if (existsSync(CONFIG_PATH)) writeFileSync(CONFIG_PATH, '', 'utf8');
}

export function hasGlobalConfig(): boolean {
  return loadGlobalConfig() !== null;
}
