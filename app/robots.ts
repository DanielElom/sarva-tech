import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/**
 * Everything public is crawlable. The only disallowed path is /api/, which
 * holds the health endpoint and the form handler — neither is a page, and the
 * intake handler only answers POST, so a crawler requesting it gets a 405 and
 * learns nothing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
    host: SITE.url,
  };
}
