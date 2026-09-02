import { SiteShell } from '@/components/chrome/site-shell';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
