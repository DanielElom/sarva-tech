/**
 * Site-level constants: navigation, contact details, metadata.
 *
 * CLAUDE.md 9: Contact is deliberately absent from the primary navigation so it
 * does not compete with "Start a Project". It is reachable from the footer.
 * CLAUDE.md 11: WhatsApp only. No social accounts exist yet, no physical address.
 */

/**
 * Thrown when the site URL cannot be resolved to something `new URL()` accepts.
 * Named so a build failure says what is wrong rather than surfacing a bare
 * `TypeError: Invalid URL` from inside Next's metadata handling.
 */
export class SiteUrlError extends Error {
  override readonly name = 'SiteUrlError';
}

/**
 * `??` is not enough here. Next inlines `process.env.NEXT_PUBLIC_*` at build
 * time, and a variable that is not set becomes the empty string rather than
 * `undefined` — which `??` passes straight through. That is exactly how an
 * empty string reached `new URL()` and failed the Vercel build while every
 * local build passed.
 */
function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Vercel exposes host names without a scheme. */
function withScheme(value: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

type UrlSource = {
  /** Where the value came from, used in the error message. */
  source: string;
  value: string | null;
};

/**
 * Resolve the canonical origin, in priority order:
 *
 *   1. NEXT_PUBLIC_SITE_URL            an explicit override always wins
 *   2. VERCEL_PROJECT_PRODUCTION_URL   the production domain, scheme-less
 *   3. VERCEL_URL                      this preview deployment, scheme-less
 *   4. http://localhost:3000           local development
 *
 * The chain always terminates in a valid literal, so it cannot produce an empty
 * or undefined value. Anything that survives the chain is parsed and checked; a
 * malformed override throws SiteUrlError during the build rather than shipping.
 *
 * Note that only NEXT_PUBLIC_SITE_URL is visible to client bundles — the two
 * VERCEL_ variables are server-only. next.config.ts therefore resolves this once
 * at build time and pins the result into NEXT_PUBLIC_SITE_URL, so the browser
 * and the server agree on the canonical origin without anything being set by
 * hand in the Vercel dashboard.
 */
export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const candidates: UrlSource[] = [
    { source: 'NEXT_PUBLIC_SITE_URL', value: present(env.NEXT_PUBLIC_SITE_URL) },
    {
      source: 'VERCEL_PROJECT_PRODUCTION_URL',
      value: present(env.VERCEL_PROJECT_PRODUCTION_URL),
    },
    { source: 'VERCEL_URL', value: present(env.VERCEL_URL) },
    { source: 'built-in default', value: 'http://localhost:3000' },
  ];

  const chosen = candidates.find((candidate) => candidate.value !== null);

  /* istanbul ignore next — the last candidate is a literal, so this cannot happen. */
  if (!chosen?.value) {
    throw new SiteUrlError(
      'No site URL candidate resolved. This is unreachable unless the fallback chain was edited.',
    );
  }

  const withProtocol = withScheme(chosen.value);

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new SiteUrlError(
      `${chosen.source} is not a usable URL. Got ${JSON.stringify(chosen.value)}, ` +
        `which resolved to ${JSON.stringify(withProtocol)}. ` +
        'Set NEXT_PUBLIC_SITE_URL to a full origin such as https://sarva.tech.',
    );
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new SiteUrlError(
      `${chosen.source} must be http or https. Got ${JSON.stringify(parsed.protocol)} ` +
        `from ${JSON.stringify(chosen.value)}.`,
    );
  }

  // `origin` normalises away any trailing slash, path, query or fragment, so
  // metadataBase gets a clean origin whatever shape the variable arrived in.
  return parsed.origin;
}

export const SITE = {
  name: 'Sarva Tech',
  /** CLAUDE.md 1 — the central message, reinforced everywhere. */
  tagline: 'Sarva Tech solves problems with technology.',
  description:
    'Sarva Tech identifies problems, designs solutions, builds them, ships them, and keeps improving them.',
  url: resolveSiteUrl(),
} as const;

export type NavLink = { href: string; label: string };

/** Primary navigation. Contact is not here on purpose — see CLAUDE.md 9. */
export const PRIMARY_NAV: readonly NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
];

/** Every "Start a Project" CTA lands here, and keeps this name throughout. */
export const PRIMARY_CTA = { href: '/start', label: 'Start a Project' } as const;

export const CONTACT = {
  whatsappNumber: '+234 813 393 3217',
  whatsappUrl: 'https://wa.me/2348133933217',
  /**
   * CLAUDE.md 11: email is pending until the domain and Google Workspace are
   * live. Nothing is invented here. Set in S6.
   */
  email: null,
} as const;

export const FOOTER_COLUMNS: readonly { heading: string; links: readonly NavLink[] }[] = [
  {
    heading: 'Navigation',
    links: [
      { href: '/', label: 'Home' },
      { href: '/services', label: 'Services' },
      { href: '/solutions', label: 'Solutions' },
      { href: '/work', label: 'Work' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { href: '/services#discovery', label: 'Problem Discovery' },
      { href: '/services#product', label: 'Product Design' },
      { href: '/services#engineering', label: 'Engineering' },
      { href: '/services#operate', label: 'Ship and Operate' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { href: '/solutions', label: 'All Solutions' },
      { href: '/work', label: 'Case Studies' },
      { href: '/start', label: 'Start a Project' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
];

export const LEGAL_LINKS: readonly NavLink[] = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact Us' },
];
