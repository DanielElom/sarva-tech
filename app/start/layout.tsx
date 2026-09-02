import { SiteShell } from '@/components/chrome/site-shell';

/**
 * /start sits outside the (site) group per CLAUDE.md 3 — it is a flow, not a
 * marketing page, and S5 gives it its own chrome-light treatment. For now it
 * renders in the same shell so the route is complete and navigable.
 */
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
