'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/cn';

/**
 * What we build with. Eight categories, each opening to its technologies.
 *
 * A disclosure list, deliberately NOT the tabs pattern S2 uses for the seven
 * stages. Tabs suit a sequence you step through; these eight are reference
 * material you consult, in no order, and repeating the same widget twice on one
 * page would read as a template rather than as two considered answers. Expanding
 * in place also keeps a category's technologies next to its name, which matters
 * on a phone where a side panel would push the label off screen.
 *
 * The accessibility bar is the same as the stages: every header is a real button
 * with aria-expanded and aria-controls, arrow keys move between headers, and all
 * eight descriptions ship in the HTML rather than arriving on interaction. A
 * collapsed panel stays in the document — so it is there for a crawler and for a
 * reader without JavaScript — but is marked `inert`, which takes it out of the
 * tab order and the accessibility tree. Opening is a CSS grid transition, no
 * animation library, and the reduced-motion rule flattens it to an instant
 * change without this component knowing.
 *
 * Technology names are set in the display face, not the monospace readout:
 * CLAUDE.md 4.6 fences that to instrumentation, and this is content. No brand
 * marks — a logo wall says nothing a name does not.
 */

type Category = { name: string; tools: string; purpose: string };

const CATEGORIES: Category[] = [
  {
    name: 'Frontend',
    tools: 'React, Next.js, Vue, Nuxt, TypeScript',
    purpose: 'Interfaces that stay fast on the devices people actually own.',
  },
  {
    name: 'Backend',
    tools: 'Node.js, NestJS, Laravel',
    purpose: 'The logic and rules that keep a system honest under load.',
  },
  {
    name: 'Mobile',
    tools: 'React Native, progressive web apps',
    purpose: 'Reaching people where they already are.',
  },
  {
    name: 'Database',
    tools: 'PostgreSQL, Redis, Firebase',
    purpose: "Storing things so they're still correct after ten thousand writes.",
  },
  {
    name: 'Cloud',
    tools: 'AWS, Vercel, managed infrastructure',
    purpose: 'Running reliably without a server room.',
  },
  {
    name: 'Infrastructure',
    tools: 'Docker, CI/CD, monitoring',
    purpose: 'Shipping changes without holding your breath.',
  },
  {
    name: 'Real-time',
    tools: 'WebSockets, event streams',
    purpose: 'When "refresh the page" isn’t an acceptable answer.',
  },
  {
    name: 'AI',
    tools: 'Language models, automation, document processing',
    purpose: "Applied where it earns its cost, not because it's on the roadmap.",
  },
];

export function TechnologyEcosystem() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const headerId = (index: number) => `${baseId}-header-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;

  const focusHeader = (index: number) => {
    const next = (index + CATEGORIES.length) % CATEGORIES.length;
    headerRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusHeader(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusHeader(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusHeader(0);
        break;
      case 'End':
        event.preventDefault();
        focusHeader(CATEGORIES.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <section
      data-surface="inverted"
      /*
       * The footer's conversion band is also inverted and sits immediately
       * below. Without this hairline the two share a background and merge into
       * one undifferentiated block. See the surface-rhythm note in the report.
       */
      className="border-line border-b"
      aria-labelledby={`${baseId}-heading`}
    >
      <Container className="py-section">
        <div className="measure">
          <h2 id={`${baseId}-heading`} className="text-h2">
            What we build with.
          </h2>
          <p className="text-lead text-muted mt-5">
            Tools are chosen per problem, not per fashion. Here&rsquo;s what&rsquo;s usually
            in reach.
          </p>
        </div>

        <div className="mt-14">
          {CATEGORIES.map((category, index) => {
            const expanded = open === index;
            return (
              <div key={category.name} className="border-line border-t last:border-b">
                <h3>
                  <button
                    ref={(element) => {
                      headerRefs.current[index] = element;
                    }}
                    type="button"
                    id={headerId(index)}
                    aria-expanded={expanded}
                    aria-controls={panelId(index)}
                    onClick={() => setOpen(expanded ? null : index)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    className={cn(
                      'group flex w-full items-center justify-between gap-6 py-5 text-left',
                      'transition-colors duration-150',
                      expanded ? 'text-primary' : 'text-muted hover:text-primary',
                    )}
                  >
                    <span className="font-display text-h4 tracking-heading">
                      {category.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'text-accent-text shrink-0 transition-transform duration-200',
                        expanded && 'rotate-45',
                      )}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        focusable="false"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId(index)}
                  role="region"
                  aria-labelledby={headerId(index)}
                  inert={!expanded}
                  data-open={expanded ? '' : undefined}
                  className="disclosure-panel"
                >
                  <div>
                    <div className="pb-7">
                      <p className="font-display text-lead tracking-heading">
                        {category.tools}
                      </p>
                      <p className="measure text-muted mt-2">{category.purpose}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
