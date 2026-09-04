'use client';

import { useEffect, useRef } from 'react';
import {
  buildGraph,
  CONNECT_DISTANCE,
  driftedPosition,
  edgeOpacity,
  GRAPH_VIEWBOX,
} from '@/lib/hero-graph';

/**
 * The animated hero layer. Hand-rolled canvas on requestAnimationFrame, no
 * animation library (CLAUDE.md 5).
 *
 * What the motion is for: the graph settles and breathes, and connections near
 * the cursor brighten. It communicates that this is a live system rather than a
 * picture of one. It is deliberately slow and small-amplitude — instrumentation
 * idling, not a screensaver, and emphatically not a particle field.
 *
 * The loop stops completely when the panel scrolls out of view or the tab is
 * hidden. Not throttled — cancelled (CLAUDE.md 5: no animation may run
 * continuously off-screen or when the tab is hidden).
 *
 * Colour never appears here as a literal. Every value is read from the resolved
 * custom properties on the canvas itself, which is also what makes the drawing
 * follow the theme toggle for free.
 */

/** Frame count is exposed so the pause behaviour can be asserted, not assumed. */
type InstrumentedCanvas = HTMLCanvasElement & { __heroFrames?: number };

type Palette = { edge: string; node: string; hub: string };

function readPalette(element: Element): Palette {
  const styles = getComputedStyle(element);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  return {
    edge: token('--sv-muted'),
    node: token('--sv-muted'),
    hub: token('--sv-accent'),
  };
}

export default function HeroNodeGraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current as InstrumentedCanvas | null;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const { nodes, edges } = buildGraph();
    const scaleX = () => canvas.clientWidth / GRAPH_VIEWBOX.width;
    const scaleY = () => canvas.clientHeight / GRAPH_VIEWBOX.height;

    let palette = readPalette(canvas);
    let frame = 0;
    let running = false;
    let onScreen = false;
    let tabVisible = !document.hidden;
    let clock = 0;
    let lastTimestamp = 0;

    // Pointer response is desktop-only, behind a pointer query (CLAUDE.md 5).
    const finePointer = window.matchMedia('(pointer: fine)');
    let pointer: { x: number; y: number } | null = null;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const sx = scaleX();
      const sy = scaleY();
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      const positions = nodes.map((node) => driftedPosition(node, clock));

      context.lineWidth = 0.6 * Math.min(sx, sy);
      context.strokeStyle = palette.edge;
      for (const edge of edges) {
        const from = positions[edge.a]!;
        const to = positions[edge.b]!;

        let alpha = edgeOpacity(edge);
        if (pointer) {
          // Brighten connections whose midpoint is near the cursor. Subtle, and
          // it falls off quickly so it reads as a probe rather than a glow.
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const distance = Math.hypot(midX - pointer.x, midY - pointer.y);
          const nearness = Math.max(0, 1 - distance / (CONNECT_DISTANCE * 0.9));
          alpha += nearness * 0.45;
        }

        context.globalAlpha = Math.min(alpha, 0.95);
        context.beginPath();
        context.moveTo(from.x * sx, from.y * sy);
        context.lineTo(to.x * sx, to.y * sy);
        context.stroke();
      }

      for (const [index, node] of nodes.entries()) {
        const position = positions[index]!;
        context.globalAlpha = node.hub ? 0.95 : 0.7;
        context.fillStyle = node.hub ? palette.hub : palette.node;
        context.beginPath();
        context.arc(
          position.x * sx,
          position.y * sy,
          node.radius * Math.min(sx, sy),
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      context.globalAlpha = 1;
    };

    const tick = (timestamp: number) => {
      if (!running) return;
      // Clamp so a long pause cannot make the graph jump on resume.
      if (lastTimestamp) clock += Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;
      canvas.__heroFrames = (canvas.__heroFrames ?? 0) + 1;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const play = () => {
      if (running) return;
      running = true;
      lastTimestamp = 0;
      canvas.dataset.state = 'running';
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      canvas.dataset.state = 'paused';
    };

    const sync = () => {
      if (onScreen && tabVisible) play();
      else pause();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const onVisibilityChange = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!running) draw();
    });
    resizeObserver.observe(canvas);

    // The palette is resolved from tokens, so a theme toggle just re-reads it.
    const themeObserver = new MutationObserver(() => {
      palette = readPalette(canvas);
      if (!running) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      const bounds = canvas.getBoundingClientRect();
      pointer = {
        x: ((event.clientX - bounds.left) / bounds.width) * GRAPH_VIEWBOX.width,
        y: ((event.clientY - bounds.top) / bounds.height) * GRAPH_VIEWBOX.height,
      };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    if (finePointer.matches) {
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
    }

    resize();
    draw();
    canvas.dataset.state = 'paused';

    return () => {
      pause();
      observer.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-hero-canvas=""
      aria-hidden="true"
      className="absolute inset-0 size-full"
    />
  );
}
