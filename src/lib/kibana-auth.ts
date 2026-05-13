export type AuthMode = 'basic' | 'api_key';

export interface KibanaAuthPayload {
  authMode?: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
}

export function buildBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export function buildApiKeyAuthHeader(apiKey: string): string {
  return `ApiKey ${apiKey.trim()}`;
}

export function buildAuthHeader(payload: KibanaAuthPayload): string {
  if (payload.authMode === 'api_key') {
    if (!payload.apiKey?.trim()) throw new Error('API key is required');
    return buildApiKeyAuthHeader(payload.apiKey);
  }

  if (!payload.username || !payload.password) {
    throw new Error('Username and password are required');
  }
  return buildBasicAuthHeader(payload.username, payload.password);
}

export function baseKibanaHeaders(authHeader: string, includeContentType = true): Record<string, string> {
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'kibana',
    Authorization: authHeader,
  };
}

export function kibanaHeadersFromPayload(payload: KibanaAuthPayload, includeContentType = true): Record<string, string> {
  return baseKibanaHeaders(buildAuthHeader(payload), includeContentType);
}
