/** Minimal class joiner. No dependency needed for what this project does. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
