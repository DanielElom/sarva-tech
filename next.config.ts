import path from 'node:path';
import type { NextConfig } from 'next';
import { resolveSiteUrl } from './lib/site';

/**
 * Resolved once, here, so the value is identical everywhere.
 *
 * Only NEXT_PUBLIC_* variables reach the browser, and the Vercel-provided host
 * names are server-only. Pinning the resolved origin into NEXT_PUBLIC_SITE_URL
 * at build time means a preview or production deploy gets the right canonical
 * URL on both sides with nothing set by hand in the Vercel dashboard. If the
 * variable is already set explicitly, the resolver returns it unchanged.
 *
 * A malformed value throws SiteUrlError here — before any page is built.
 */
const siteUrl = resolveSiteUrl();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root. Without it Turbopack walks up and finds an
  // unrelated lockfile in the home directory.
  turbopack: { root: path.resolve(process.cwd()) },
  poweredByHeader: false,
  // CLAUDE.md 2 / definition of done: the build fails on type errors.
  // Next 16 no longer runs ESLint during `next build`, so `pnpm build` runs it
  // as a separate gate before compiling. Same outcome: lint errors fail the build.
  typescript: { ignoreBuildErrors: false },
  experimental: {
    // The stylesheet was the single render-blocking request on every route and
    // showed up as ~2s of LCP render delay on throttled mobile. Inlining it
    // removes that round trip; the CSS is small because it is all tokens.
    inlineCss: true,
  },
  env: {
    // Stamped at build time so /api/health can report honestly when it was built.
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
};

export default nextConfig;
