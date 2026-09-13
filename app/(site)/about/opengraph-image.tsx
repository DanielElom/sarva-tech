import { OG_CONTENT_TYPE, OG_SIZE, ogCard, renderOgImage } from '@/lib/og';

/** See lib/og.tsx — one builder, one card definition, three lines per route. */
export const alt = `${ogCard('/about').title} — Sarva Tech`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage(ogCard('/about'));
}
