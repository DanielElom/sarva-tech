import Link from 'next/link';
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'sm' | 'md';

/**
 * Radius comes from the scale, and a button is not a card: it takes
 * `rounded-sm`, while cards take `rounded-md` and full panels `rounded-lg`.
 * The hierarchy is the point (CLAUDE.md 4.5 / design system).
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-sm font-body font-medium ' +
  'transition-[background-color,color,border-color,transform] duration-150 ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-60';

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-body',
};

/**
 * `accent` is a fill and only a fill (CLAUDE.md 4.2). The accent fill measures
 * 1.96:1 against the day base, so the primary button carries an `accent-text`
 * border — that border, not the fill, is what gives the control the 3:1
 * boundary WCAG 1.4.11 asks for. Label sits on `on-accent` at 8.54:1.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent border border-accent-text hover:brightness-95',
  secondary:
    'bg-transparent text-primary border border-line-strong hover:bg-surface-frame',
  quiet: 'bg-transparent text-accent-text underline-offset-4 hover:underline px-0',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    'href' | 'className' | 'children'
  >) {
  return (
    <Link
      href={href}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: CommonProps & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'>) {
  return (
    <button
      type={type}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
