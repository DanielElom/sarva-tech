/**
 * Site-level constants: navigation, contact details, metadata.
 *
 * CLAUDE.md 9: Contact is deliberately absent from the primary navigation so it
 * does not compete with "Start a Project". It is reachable from the footer.
 * CLAUDE.md 11: WhatsApp only. No social accounts exist yet, no physical address.
 */

export const SITE = {
  name: 'Sarva Tech',
  /** CLAUDE.md 1 — the central message, reinforced everywhere. */
  tagline: 'Sarva Tech solves problems with technology.',
  description:
    'Sarva Tech identifies problems, designs solutions, builds them, ships them, and keeps improving them.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sarva.tech',
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
