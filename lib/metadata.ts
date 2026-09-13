import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

/**
 * Per-route metadata, built in one place.
 *
 * This exists because of a specific failure found by reading the rendered HTML
 * rather than reasoning about the config. Next shallow-merges metadata: a page
 * that sets only `title` and `description` inherits the ROOT's `openGraph`
 * object wholesale, so every route on this site was advertising the homepage's
 * `og:title` to anything that unfurls a link. Setting `title` per page looked
 * like it was enough, and the page source said otherwise. CLAUDE.md 13 calls
 * this out: OG failures are invisible until someone shares the link.
 *
 * So `openGraph` is never partially specified. Every route gets a complete
 * object from here, which also means the og:url is the route's own rather than
 * absent — Next does not derive it from the canonical.
 *
 * `openGraph.images` is deliberately not set: the `opengraph-image.tsx` file in
 * each segment supplies it, with absolute URLs and the width/height tags, and
 * naming it here would override that.
 */
export function pageMetadata({
  route,
  title,
  description,
  absoluteTitle,
}: {
  /** Root-relative path. Also the canonical and the og:url. */
  route: string;
  /** The bare page title. The `%s — Sarva Tech` template is applied for <title>. */
  title: string;
  description: string;
  /**
   * The homepage's <title> is not `Home — Sarva Tech`. Passing the finished
   * string here opts that one route out of the template without needing a
   * second code path for it.
   */
  absoluteTitle?: string;
}): Metadata {
  // The template only applies to <title>. og:title has no template, so the
  // qualified form is built here or the card reads as an orphaned fragment.
  const qualified = absoluteTitle ?? `${title} — ${SITE.name}`;

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: route },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title: qualified,
      description,
      url: route,
    },
    twitter: {
      card: 'summary_large_image',
      title: qualified,
      description,
    },
  };
}
