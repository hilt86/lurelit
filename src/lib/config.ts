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
  writeFileSync(CONFIG_PATH, encrypt(JSON.stringify(config)), 'utf8');
}

export function loadGlobalConfig(): GlobalConfig | null {
  if (process.env.KIBANA_URL && process.env.WORKFLOW_ID) {
    return { kibanaUrl: process.env.KIBANA_URL, workflowId: process.env.WORKFLOW_ID, huntEnabled: true };
  }

  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const json = decrypt(readFileSync(CONFIG_PATH, 'utf8'));
    const parsed = JSON.parse(json);
    return { huntEnabled: true, ...parsed } as GlobalConfig;
  } catch {
    return null;
  }
}

export function clearGlobalConfig(): void {
  if (existsSync(CONFIG_PATH)) writeFileSync(CONFIG_PATH, '', 'utf8');
}

export function hasGlobalConfig(): boolean {
  return loadGlobalConfig() !== null;
}
