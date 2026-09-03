import { cn } from '@/lib/cn';
import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';

type ContainerTag = 'div' | 'header' | 'footer' | 'section' | 'nav' | 'article';

/**
 * Page gutter and max width. Both come from the layout tokens.
 *
 * Remaining props are forwarded to the element. That is not incidental: this
 * component swallowed `data-surface="inverted"` on the home page, so a section
 * that was supposed to flip against the theme rendered as an ordinary one and
 * nothing failed loudly. Anything that wraps an element has to pass through the
 * attributes that give it meaning.
 */
export function Container({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: ContainerTag;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'className'>) {
  const Element = Tag as ElementType;
  return (
    <Element className={cn('mx-auto w-full max-w-page px-gutter', className)} {...rest}>
      {children}
    </Element>
  );
}
