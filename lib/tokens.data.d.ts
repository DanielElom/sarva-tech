/**
 * Types for the generated-from / hand-authored token data module.
 * lib/tokens.data.mjs is plain ESM so that both the Node generator script and
 * the TypeScript app can read one source of truth without a build step.
 */
type ByTheme = { night: string; day: string };

export declare const palette: Record<string, string>;

export declare const colorTokens: {
  'surface-base': ByTheme;
  'surface-raised': ByTheme;
  'surface-frame': ByTheme;
  'surface-inverted': ByTheme;
  primary: ByTheme;
  muted: ByTheme;
  accent: ByTheme;
  'accent-text': ByTheme;
  'on-accent': ByTheme;
  line: ByTheme;
  'line-strong': ByTheme;
  'status-ok': ByTheme;
  'status-warn': ByTheme;
  'status-down': ByTheme;
};

export declare const shadowTokens: { elevated: ByTheme };

export declare const typeScale: {
  caption: string;
  sm: string;
  body: string;
  lead: string;
  h4: string;
  h3: string;
  h2: string;
  h1: string;
  display: string;
};

export declare const leading: {
  display: string;
  heading: string;
  snug: string;
  body: string;
};

export declare const tracking: {
  display: string;
  heading: string;
  normal: string;
  caps: string;
};

export declare const radii: {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
};

export declare const layout: {
  gutter: string;
  section: string;
  container: string;
  measure: string;
};

export declare const themes: readonly ('night' | 'day')[];
export declare const defaultTheme: 'night' | 'day';
