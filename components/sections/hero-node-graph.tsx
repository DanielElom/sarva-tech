import { Readout } from '@/components/ui/readout';
import { buildGraph, edgeOpacity, GRAPH_VIEWBOX } from '@/lib/hero-graph';
import { HeroNodeGraphAnimator } from './hero-node-graph-animator';

/**
 * The hero panel: an architecture readout with a node graph inside it.
 *
 * This is a server component, and what it renders is the finished static
 * composition — not a placeholder. That matters three ways:
 *
 *  - it is the LCP candidate, and it is in the HTML, so LCP does not wait on
 *    JavaScript;
 *  - the panel reserves its aspect ratio before anything loads, so the animated
 *    layer arriving later cannot shift the page (CLAUDE.md 6, CLS < 0.1);
 *  - below 768px, and under reduced motion, this is the whole visual. Nothing
 *    animated is rendered and then hidden — it is never loaded at all.
 *
 * The monospace chrome is the systems-readout language of CLAUDE.md 4.6, and
 * this panel is the fence around it. It does not leak into the headline, the
 * buttons or the body copy.
 */
export function HeroNodeGraph() {
  const { nodes, edges } = buildGraph();

  return (
    <figure
      data-hero-panel=""
      aria-label="A network diagram of connected system nodes"
      className="hero-panel elevated relative isolate overflow-hidden rounded-lg"
      style={{ aspectRatio: `${GRAPH_VIEWBOX.width} / ${GRAPH_VIEWBOX.height}` }}
    >
      {/* Panel chrome. Decorative labels, so they are hidden from assistive
          technology — the figure's own label carries the meaning. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4"
      >
        <Readout tone="muted">SYS.ARCH_V.09</Readout>
        <Readout tone="accent" className="self-end">
          NODE_ACTIVE
        </Readout>
      </div>

      {/* Corner ticks. Instrument framing, not decoration for its own sake. */}
      <div aria-hidden="true" className="hero-ticks absolute inset-0 z-10" />

      <svg
        className="hero-static absolute inset-0 size-full"
        viewBox={`0 0 ${GRAPH_VIEWBOX.width} ${GRAPH_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g className="stroke-muted">
          {edges.map((edge) => {
            const from = nodes[edge.a]!;
            const to = nodes[edge.b]!;
            return (
              <line
                key={`${edge.a}-${edge.b}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth={0.6}
                opacity={edgeOpacity(edge)}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.radius}
              className={node.hub ? 'fill-accent' : 'fill-muted'}
              opacity={node.hub ? 0.95 : 0.7}
            />
          ))}
        </g>
      </svg>

      <HeroNodeGraphAnimator />
    </figure>
  );
}
