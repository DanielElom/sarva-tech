'use client';

/**
 * Last-resort boundary: this replaces the root layout, so it renders its own
 * <html> and <body> and cannot rely on the theme script, the providers or the
 * token stylesheet having loaded.
 *
 * That constraint is why this is the one component allowed to inline a style,
 * and it still does so from the token module rather than a literal — see
 * CLAUDE.md 4.3. It picks the night palette because that is the default theme.
 */
import { color } from '@/lib/tokens';
import { DEFAULT_THEME } from '@/lib/tokens';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME}>
      <body
        style={{
          backgroundColor: color('surface-base', DEFAULT_THEME),
          color: color('primary', DEFAULT_THEME),
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <main style={{ margin: '0 auto', maxWidth: '40rem', padding: '2rem' }}>
          <p
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '0.694rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: color('accent-text', DEFAULT_THEME),
              margin: 0,
            }}
          >
            Fatal · Application Error
          </p>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.12, margin: '1rem 0 0' }}>
            The application failed to start.
          </h1>
          <p style={{ color: color('muted', DEFAULT_THEME), marginTop: '1.5rem' }}>
            Reload the page. If it keeps failing, message us on WhatsApp and we will look at
            it.
          </p>
          {error.digest ? (
            <p style={{ color: color('muted', DEFAULT_THEME), marginTop: '1rem' }}>
              Digest {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              background: color('accent', DEFAULT_THEME),
              color: color('on-accent', DEFAULT_THEME),
              border: `1px solid ${color('accent-text', DEFAULT_THEME)}`,
              borderRadius: '4px',
              padding: '0.7rem 1.25rem',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
