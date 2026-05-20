export type DeploymentPlatform = 'vercel' | 'netlify' | 'cloudflare-pages' | 'aws-lambda' | 'self-hosted';

export function getDeploymentPlatform(): DeploymentPlatform {
  if (process.env.VERCEL) return 'vercel';
  if (process.env.NETLIFY) return 'netlify';
  if (process.env.CF_PAGES) return 'cloudflare-pages';
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'aws-lambda';
  return 'self-hosted';
}

export function isServerlessPlatform(): boolean {
  return getDeploymentPlatform() !== 'self-hosted';
}
