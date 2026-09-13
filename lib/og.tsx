import { ImageResponse } from 'next/og';
import { color } from '@/lib/tokens';
import { SITE } from '@/lib/site';

/**
 * The shared Open Graph image.
 *
 * One builder, called by a three-line `opengraph-image.tsx` in each route
 * segment. Next turns each of those into a real image URL and wires it into
 * both `og:image` and `twitter:image` automatically, with absolute URLs derived
 * from `metadataBase` — which is what stops the silent failure CLAUDE.md 13
 * warns about, where a relative OG URL looks fine until someone shares the link.
 *
 * It lives in lib/ rather than app/ for one specific reason: it needs literal
 * colour values to paint, and CLAUDE.md 4.3 confines those to the token files.
 * Reading them through `color()` keeps the grep over app/ and components/ clean
 * and means the card follows the palette if the palette changes.
 *
 * The night palette is used unconditionally. A shared link has no theme to
 * follow — there is no visitor preference to read at the moment WhatsApp or a
 * search engine fetches it — so the card is the brand's dark instrument look
 * every time rather than depending on which machine generated it.
 *
 * Satori (what renders this) supports a subset of CSS and needs an explicit
 * `display: flex` on any element with more than one child. It is not the
 * browser, so nothing here is shared with the site's own styles.
 */

/**
 * The card copy, per route.
 *
 * Deliberately shorter and blunter than the `<title>` and meta description a
 * search result uses: a shared link is read at a glance in a chat window, not
 * scanned in a list of ten results. The verification suite asserts that every
 * path in INDEXABLE_ROUTES has an entry here, so adding a route without a card
 * fails rather than silently falling back to the generic one.
 */
export const OG_CARDS: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Technology that solves problems.',
    description:
      'Sarva Tech identifies problems, designs solutions, builds them, ships them, and keeps improving them.',
  },
  '/services': {
    title: 'What we do.',
    description:
      'Problem discovery, product design, engineering, and shipping and operating what we build.',
  },
  '/solutions': {
    title: 'What we build.',
    description:
      'Sarva Tech builds its own products, not only client work. These are ours.',
  },
  '/about': {
    title: 'Technology should be useful.',
    description: 'Sarva Tech exists to make technology practical. Most of it is not.',
  },
  '/start': {
    title: 'Start a Project',
    description:
      'Tell us what is not working. Five short steps, and you will hear back with what we would build.',
  },
  '/contact': {
    title: 'Get in touch.',
    description: 'A short message, or a WhatsApp away. We read everything that arrives.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description:
      'What we collect, where it goes, and how to get it removed. No cookies, no analytics, no tracking.',
  },
  '/terms': {
    title: 'Terms of Service',
    description: 'The terms that apply to using this website. Short, and limited to it.',
  },
};

/** The card for a route, falling back to the homepage's. */
export function ogCard(path: string): { title: string; description: string } {
  return OG_CARDS[path] ?? OG_CARDS['/']!;
}

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const SURFACE = color('surface-base', 'night');
const RAISED = color('surface-raised', 'night');
const PRIMARY = color('primary', 'night');
const MUTED = color('muted', 'night');
const ACCENT = color('accent', 'night');
const LINE = color('line-strong', 'night');

export function renderOgImage({
  title,
  description,
}: {
  title: string;
  description: string;
}): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: SURFACE,
        backgroundImage: `radial-gradient(circle at 78% 18%, ${RAISED} 0%, ${SURFACE} 55%)`,
        padding: '72px 80px',
      }}
    >
      {/* Wordmark: the accent square is a fill, which is the only thing that
            token is permitted to be (CLAUDE.md 4.2). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 28, height: 28, backgroundColor: ACCENT, borderRadius: 4 }} />
        <div style={{ fontSize: 30, color: PRIMARY, letterSpacing: -0.5 }}>{SITE.name}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: title.length > 34 ? 66 : 82,
            lineHeight: 1.05,
            color: PRIMARY,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            lineHeight: 1.4,
            color: MUTED,
            maxWidth: 900,
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${LINE}`,
          paddingTop: 28,
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div>{SITE.tagline}</div>
        <div style={{ color: ACCENT }}>{new URL(SITE.url).host}</div>
      </div>
    </div>,
    { ...OG_SIZE },
  );
}
