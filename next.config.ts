import path from 'node:path';
import type { NextConfig } from 'next';

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
  },
};

export default nextConfig;
