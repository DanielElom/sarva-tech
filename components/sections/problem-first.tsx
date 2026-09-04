'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/cn';

/**
 * Start with the problem. Seven stages, selectable.
 *
 * On an inverted surface, so the page's contrast rhythm survives a theme
 * toggle (CLAUDE.md 4.1). The attribute is all that is needed — the token layer
 * gives the scope its own background and colour.
 *
 * Numbered markers are used because this genuinely is a sequence. They are set
 * in the display face with tabular figures, NOT in the monospace readout
 * treatment: CLAUDE.md 4.6 fences that to instrumentation, and a process stage
 * is not instrumentation.
 *
 * Interaction is the APG tabs pattern with a roving tabindex and automatic
 * activation — one Tab stop for the whole list, arrows to move between stages.
 * All seven descriptions are in the DOM at all times; nothing is fetched on
 * interaction, so the copy is there for crawlers and for a reader with
 * JavaScript unavailable. Selection is CSS only, and with motion reduced the
 * global rule flattens it to an instant change with nothing lost.
 */

type Stage = { title: string; body: string };

const STAGES: Stage[] = [
  {
    title: 'Problem',
    body: "What's actually going wrong, in the words of the people it happens to.",
  },
  {
    title: 'Discovery',
    body: 'Who\u2019s affected, what they do now, what it costs, what constraints are real and which are assumed.',
  },
  {
    title: 'Strategy',
    body: 'The smallest thing that solves it, and an honest answer about whether technology is the right tool at all.',
  },
  {
    title: 'Design',
    body: 'How it works before how it looks. Flows, states, and the awkward cases nobody mentions in the first meeting.',
  },
  {
    title: 'Engineering',
    body: 'Building it, with the failure modes handled rather than deferred.',
  },
  {
    title: 'Launch',
    body: 'Into real conditions, on real devices, with real users.',
  },
  {
    title: 'Optimization',
    body: 'Measuring what happens, then fixing what the measurement shows.',
  },
];

export function ProblemFirst() {
  const [selected, setSelected] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;

  const focusTab = (index: number) => {
    const next = (index + STAGES.length) % STAGES.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(STAGES.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <section data-surface="inverted" aria-labelledby={`${baseId}-heading`}>
      <Container className="py-section">
        <div className="measure">
          <h2 id={`${baseId}-heading`} className="text-h2">
            Start with the problem.
          </h2>
          <p className="mt-5 text-lead text-muted">
            Most projects begin with a solution already chosen. &ldquo;We need an
            app.&rdquo; &ldquo;We need a dashboard.&rdquo; Sometimes that&rsquo;s right.
            Often it isn&rsquo;t, and nobody finds out until the money is spent.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label="Stages of the process"
            className="flex flex-col"
          >
            {STAGES.map((stage, index) => {
              const active = index === selected;
              return (
                <button
                  key={stage.title}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(index)}
                  aria-selected={active}
                  aria-controls={panelId(index)}
                  // Roving tabindex: the list is a single Tab stop.
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelected(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  className={cn(
                    'group flex items-baseline gap-4 border-l-2 py-3.5 pl-5 text-left',
                    'transition-[color,border-color,background-color] duration-150',
                    active
                      ? 'border-accent-text text-primary'
                      : 'border-line text-muted hover:border-line-strong hover:text-primary',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'font-display text-sm tabular-nums',
                      active ? 'text-accent-text' : 'text-muted',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-display text-h4 tracking-heading">{stage.title}</span>
                </button>
              );
            })}
          </div>

          <div className="lg:pt-2">
            {STAGES.map((stage, index) => (
              <div
                key={stage.title}
                role="tabpanel"
                id={panelId(index)}
                aria-labelledby={tabId(index)}
                hidden={index !== selected}
                tabIndex={0}
                className="stage-panel measure rounded-md focus-visible:outline-2"
              >
                <p className="font-display text-h3 tracking-heading">{stage.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
