/**
 * The deployed module URL is the most reliable runtime source for the site
 * prefix. It works for both a root site (/) and a GitHub Pages project site
 * (/<repository>/), without knowing the repository name in application code.
 *
 * A page may optionally override it with:
 *   <meta name="ai-daily-base-url" content="./">
 * The value is resolved relative to this module, so it remains safe on SPA
 * history routes such as /daily/2026-09-22.
 */
const configuredBaseURL = typeof document !== 'undefined'
  ? document.querySelector('meta[name="ai-daily-base-url"]')?.content
  : '';

export const baseURL = new URL(configuredBaseURL || './', import.meta.url);

export function resolveBaseURL(path = '') {
  return new URL(path.replace(/^\.\/+/, ''), baseURL).href;
}

