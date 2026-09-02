/**
 * Typed token access. CLAUDE.md 4.1-4.5.
 *
 * Components consume tokens as Tailwind classes (`bg-surface-raised`,
 * `text-accent-text`, `rounded-md`) which are generated from the same source.
 * This module exists for the cases a class cannot cover: the pre-paint theme
 * script, `<meta name="theme-color">`, and any code that needs to reason about
 * a token by name.
 *
 * No component imports a raw value. Import from here, or use the class.
 */
import {
  colorTokens,
  shadowTokens,
  typeScale,
  leading,
  tracking,
  radii,
  layout,
  themes,
  defaultTheme,
} from './tokens.data.mjs';

export type Theme = 'night' | 'day';

export type ColorToken = keyof typeof colorTokens;
export type RadiusToken = keyof typeof radii;
export type TypeToken = keyof typeof typeScale;
export type LeadingToken = keyof typeof leading;
export type TrackingToken = keyof typeof tracking;

export const THEMES = themes as readonly Theme[];
export const DEFAULT_THEME = defaultTheme as Theme;

export const THEME_STORAGE_KEY = 'sarva-theme';
export const THEME_ATTRIBUTE = 'data-theme';

/** Human label for a theme, used by the toggle's accessible name. */
export const THEME_LABEL: Record<Theme, string> = {
  night: 'night',
  day: 'day',
};

export function isTheme(value: unknown): value is Theme {
  return value === 'night' || value === 'day';
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'night' ? 'day' : 'night';
}

/**
 * Resolve a colour token to its literal value for a theme.
 * Only for contexts that cannot use a CSS variable — meta tags, canvas, SVG
 * attributes computed in JS. Prefer the Tailwind class everywhere else.
 */
export function color(token: ColorToken, theme: Theme): string {
  return colorTokens[token][theme];
}

/** The CSS custom property backing a colour token, e.g. `var(--sv-accent-text)`. */
export function colorVar(token: ColorToken): string {
  return `var(--sv-${token})`;
}

export function shadow(theme: Theme): string {
  return shadowTokens.elevated[theme];
}

export const tokens = {
  color: colorTokens as Record<ColorToken, Record<Theme, string>>,
  shadow: shadowTokens as { elevated: Record<Theme, string> },
  type: typeScale as Record<TypeToken, string>,
  leading: leading as Record<LeadingToken, string>,
  tracking: tracking as Record<TrackingToken, string>,
  radius: radii as Record<RadiusToken, string>,
  layout: layout as Record<keyof typeof layout, string>,
} as const;
