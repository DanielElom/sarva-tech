import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeScript } from '@/components/chrome/theme-script';
import { color } from '@/lib/tokens';
import { SITE } from '@/lib/site';
import './globals.css';

/**
 * CLAUDE.md 4.5 — all three faces self-hosted via next/font. The files are
 * downloaded at build time and served from our own origin, so there is no
 * runtime request to Google, and `display: swap` with the metric fallbacks
 * next/font generates means no layout shift.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  // Not preloaded: mono is reserved for small readout labels (CLAUDE.md 4.6),
  // and preloading it competes for bandwidth with the display face that paints
  // the largest element on the page.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Technology that solves problems`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — Technology that solves problems`,
    description: SITE.description,
    url: SITE.url,
  },
  robots: { index: true, follow: true },
  // Generated from the tokens by scripts/generate-tokens.mjs.
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
};

export const viewport: Viewport = {
  // Matches the resolved surface-base for each theme so the browser chrome
  // does not flash the wrong colour on mobile.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: color('surface-base', 'night') },
    { media: '(prefers-color-scheme: light)', color: color('surface-base', 'day') },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the pre-paint script writes data-theme on this
    // element before React sees it, which is the whole point of it.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
