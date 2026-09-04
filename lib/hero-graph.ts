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
  /** Hubs are drawn heavier and carry the accent fill. */
  hub: boolean;
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

const NODE_COUNT = 18;
const HUB_IDS = new Set([2, 7, 13]);
/** Two nodes join if they are closer than this, in viewBox units. */
const CONNECT_WITHIN = 78;

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
        (other) => Math.hypot(other.x - x, other.y - y) < 30,
      );
      if (!tooClose) break;
    }
    const hub = HUB_IDS.has(id);
    nodes.push({
      id,
      x,
      y,
      radius: hub ? 4.2 : 2.1,
      hub,
      phase: random() * Math.PI * 2,
      // Deliberately small. This reads as instrumentation settling, not drifting
      // decoration — a node never travels more than ~3px at the rendered size.
      amplitude: 1.6 + random() * 1.8,
      speed: 0.08 + random() * 0.07,
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
  return 0.5 - (edge.length / CONNECT_WITHIN) * 0.32;
}

export const CONNECT_DISTANCE = CONNECT_WITHIN;
