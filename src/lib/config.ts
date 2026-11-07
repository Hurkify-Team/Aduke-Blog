// Keep design samples locally; public builds default to real content only.
export const showDemoContent = process.env.ADUKE_DEMO_CONTENT === 'true' || (process.env.ADUKE_DEMO_CONTENT !== 'false' && process.env.NODE_ENV !== 'production');
export function siteOrigin() {
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || (vercelDomain ? `https://${vercelDomain}` : 'http://localhost:3000')).origin;
}
