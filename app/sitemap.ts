import type { MetadataRoute } from 'next';
import { INDEXABLE_ROUTES, SITE } from '@/lib/site';

/**
 * Generated from INDEXABLE_ROUTES so it cannot drift from the site.
 *
 * `/work` is deliberately absent: it is a permanent redirect to /solutions
 * (next.config.ts), and listing a URL that 308s asks a crawler to discover a
 * page only to be told it moved. Nothing else is excluded — every route a
 * person can reach is here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_ROUTES.map((route) => ({
    url: new URL(route.path, SITE.url).toString(),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
