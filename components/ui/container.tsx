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
    <Tag className={cn('max-w-page px-gutter mx-auto w-full', className)}>{children}</Tag>
  );
}
