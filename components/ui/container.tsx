import { cn } from '@/lib/cn';
import { type ReactNode } from 'react';

/** Page gutter and max width. Both come from the layout tokens. */
export function Container({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'header' | 'footer' | 'section' | 'nav';
}) {
  return (
    <Tag className={cn('mx-auto w-full max-w-page px-gutter', className)}>{children}</Tag>
  );
}
