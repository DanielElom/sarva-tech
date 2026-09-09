import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { SERVICES } from '@/lib/services';

/**
 * The services ecosystem: a central Sarva Tech node with the five categories
 * around it.
 *
 * This is a map, not a widget. The homepage already carries a tab list and a
 * disclosure list, and a third selection widget here would make the site feel
 * like one component reused with different labels. More importantly, /services
 * is the page someone opens wanting detail — putting four fifths of it behind a
 * selector is hostile on the one page that exists to answer questions.
 *
 * So every category is rendered in full, always, further down the page. This
 * diagram is an overview and a set of jump links into it. Selecting a category
 * does change what you are looking at — the browser moves to it and `:target`
 * marks it — but nothing is ever hidden, which also means the whole page is
 * there for a crawler and for a reader with JavaScript unavailable.
 *
 * It needs no client JavaScript at all: anchors, CSS, and an inline SVG. On a
 * budget with 13KB of headroom, the cheapest interactive pattern that answers
 * the brief is the right one.
 *
 * Below the large breakpoint the radial layout is replaced, not shrunk — a node
 * diagram at 390px is unreadable. Touch gets a wrapped row of full-size targets.
 */

/** Node positions on the circle, in a 440x340 viewBox. Hand-placed. */
const RADIUS_X = 168;
const RADIUS_Y = 118;
const CENTER_X = 220;
const CENTER_Y = 170;

function nodePosition(index: number, total: number) {
  // Start at the top and go clockwise, so reading order matches visual order.
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER_X + Math.cos(angle) * RADIUS_X,
    y: CENTER_Y + Math.sin(angle) * RADIUS_Y,
  };
}

export function ServicesEcosystem() {
  const total = SERVICES.length;

  return (
    <section data-surface="inverted" aria-labelledby="services-map-heading">
      <Container className="py-section">
        <h2 id="services-map-heading" className="sr-only">
          Service categories
        </h2>

        {/* Desktop: the ecosystem proper. */}
        <div className="hidden lg:block">
          <svg
            viewBox="0 0 440 340"
            className="mx-auto w-full max-w-3xl"
            role="presentation"
          >
            <g className="stroke-line-strong" strokeWidth={0.75} opacity={0.5}>
              {SERVICES.map((service, index) => {
                const { x, y } = nodePosition(index, total);
                return <line key={service.id} x1={CENTER_X} y1={CENTER_Y} x2={x} y2={y} />;
              })}
            </g>

            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={44}
              className="fill-surface-raised stroke-line-strong"
              strokeWidth={1}
            />
            <text
              x={CENTER_X}
              y={CENTER_Y - 4}
              textAnchor="middle"
              className="fill-primary font-display text-[13px] font-semibold"
            >
              Sarva Tech
            </text>
            <text
              x={CENTER_X}
              y={CENTER_Y + 12}
              textAnchor="middle"
              className="fill-muted font-body text-[9px]"
            >
              five ways in
            </text>

            {SERVICES.map((service, index) => {
              const { x, y } = nodePosition(index, total);
              return (
                <a
                  key={service.id}
                  href={`#${service.id}`}
                  className="services-node"
                  aria-label={`${service.name} — jump to details`}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={34}
                    className="fill-surface-base stroke-line-strong"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    className="fill-primary font-display text-[11px] font-medium"
                  >
                    {service.short}
                  </text>
                </a>
              );
            })}
          </svg>
        </div>

        {/* Touch: full-size targets, not a shrunk diagram. */}
        <ul className="flex flex-wrap gap-3 lg:hidden">
          {SERVICES.map((service) => (
            <li key={service.id}>
              <Link
                href={`#${service.id}`}
                className="border-line-strong text-primary hover:border-accent-text hover:text-accent-text flex min-h-11 items-center rounded-sm border px-4 py-2.5 text-sm transition-colors duration-150"
              >
                {service.name}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
