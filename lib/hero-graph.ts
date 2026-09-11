/**
 * Geometry for the hero node graph.
 *
 * Deterministic on purpose. The static composition is server-rendered and is
 * the LCP candidate; the animated canvas layers over it later with the same
 * node positions. If the two disagreed, the handover would visibly jump. A
 * seeded generator gives identical output on the server and the client without
 * hand-placing twenty nodes.
 *
 * Pure data and pure functions — no DOM, no colour. Colour is read from the
 * resolved tokens at paint time (CLAUDE.md 4.3).
 */

export const GRAPH_VIEWBOX = { width: 320, height: 240 } as const;

export type GraphNode = {
  id: number;
  /** Resting position in viewBox units. */
  x: number;
  y: number;
  radius: number;
  /**
   * Visual weight. `hub` nodes are the largest and carry the accent fill;
   * `accent` nodes are smaller but still amber; the rest are muted.
   */
  hub: boolean;
  accent: boolean;
  /** Drift parameters. Bounded oscillation, never a random walk. */
  phase: number;
  amplitude: number;
  speed: number;
};

export type GraphEdge = { a: number; b: number; length: number };

/** mulberry32 — small, fast, and identical everywhere. */
function seeded(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * Density matches the approved design: a populated graph rather than a sketch.
 * Node count is geometry, not payload — the drawing code is a loop, so sixty
 * nodes cost the same bytes as eighteen.
 */
const NODE_COUNT = 60;
/** Every third node is amber, and every tenth is a full hub. */
const isHub = (id: number) => id % 10 === 3;
const isAccent = (id: number) => !isHub(id) && id % 3 === 1;
/** Two nodes join if they are closer than this, in viewBox units. */
const CONNECT_WITHIN = 46;
/** Rejection-sampling floor, loose enough that sixty nodes actually fit. */
const MIN_SEPARATION = 17;

export function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const random = seeded(20260904);
  const { width, height } = GRAPH_VIEWBOX;
  const margin = 26;

  const nodes: GraphNode[] = [];
  for (let id = 0; id < NODE_COUNT; id++) {
    // Rejection-sample so nodes never clump into an unreadable knot.
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 24; attempt++) {
      x = margin + random() * (width - margin * 2);
      y = margin + random() * (height - margin * 2);
      const tooClose = nodes.some(
        (other) => Math.hypot(other.x - x, other.y - y) < MIN_SEPARATION,
      );
      if (!tooClose) break;
    }
    const hub = isHub(id);
    const accent = isAccent(id);
    nodes.push({
      id,
      x,
      y,
      radius: hub ? 4.6 : accent ? 2.6 : 1.8,
      hub,
      accent,
      phase: random() * Math.PI * 2,
      /*
       * Slow, but actually visible.
       *
       * These were 1.6-3.4 units over a 47-75 second cycle, which works out at
       * 0.22-0.69 CSS px/sec once drawn — below the speed at which a person
       * reads something as moving, so the panel looked static in production
       * while the loop ran at 60fps. At roughly 1.5 px per viewBox unit these
       * give a peak of about 4-7 px/sec on a cycle of 8-13 seconds: a graph
       * that breathes, still nowhere near a screensaver.
       */
      amplitude: 3.2 + random() * 1.8,
      speed: 0.5 + random() * 0.32,
    });
  }

  const edges: GraphEdge[] = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const first = nodes[a]!;
      const second = nodes[b]!;
      const length = Math.hypot(first.x - second.x, first.y - second.y);
      if (length <= CONNECT_WITHIN) edges.push({ a, b, length });
    }
  }

  return { nodes, edges };
}

/** Resting position plus this frame's drift. Shared by both renderers. */
export function driftedPosition(
  node: GraphNode,
  seconds: number,
): { x: number; y: number } {
  return {
    x: node.x + Math.sin(seconds * node.speed + node.phase) * node.amplitude,
    y: node.y + Math.cos(seconds * node.speed * 0.82 + node.phase) * node.amplitude,
  };
}

/**
 * Opacity for an edge at rest. Longer connections read fainter, which is what
 * makes the graph look like a topology rather than a mesh of equal lines.
 */
export function edgeOpacity(edge: GraphEdge): number {
  // Denser graph, so each line carries less weight or the panel turns to mesh.
  return 0.34 - (edge.length / CONNECT_WITHIN) * 0.2;
}

export const CONNECT_DISTANCE = CONNECT_WITHIN;
