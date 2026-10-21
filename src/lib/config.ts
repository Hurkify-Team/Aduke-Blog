// Keep design samples locally; public builds default to real content only.
export const showDemoContent = process.env.ADUKE_DEMO_CONTENT === 'true' || (process.env.ADUKE_DEMO_CONTENT !== 'false' && process.env.NODE_ENV !== 'production');
export function siteOrigin() { return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin; }
