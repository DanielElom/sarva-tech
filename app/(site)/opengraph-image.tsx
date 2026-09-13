import { OG_CONTENT_TYPE, OG_SIZE, ogCard, renderOgImage } from '@/lib/og';

/**
 * The homepage's card. See lib/og.tsx for the builder.
 *
 * This file has to live in the SAME route segment as the page whose metadata it
 * belongs to. It was in app/ and the homepage silently lost its og:image: a
 * child segment that declares its own `openGraph` object does not inherit the
 * parent segment's file-convention image, and app/(site)/page.tsx declares one.
 * The image route still returned a valid PNG the whole time — nothing pointed
 * at it. Exactly the failure CLAUDE.md 13 describes.
 */
export const alt = `${ogCard('/').title} — Sarva Tech`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage(ogCard('/'));
}
