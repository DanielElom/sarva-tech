# Sarva Tech

The Sarva Tech website. `CLAUDE.md` is the source of truth for stack, design
tokens, motion policy and constraints — read it before changing anything.

## Running it

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

`predev` and `prebuild` regenerate `styles/tokens.css` from `lib/tokens.data.mjs`,
so the CSS and the typed tokens can never drift.

## Checks

```bash
pnpm tokens                       # regenerate styles/tokens.css + public/favicon.svg
node scripts/contrast.mjs         # verify every contrast floor in CLAUDE.md 4.4
pnpm typecheck                    # tsc --noEmit, strict
pnpm lint                         # includes the no-hardcoded-colour rule
pnpm build                        # lint, then next build
pnpm verify                       # all of the above in order

node scripts/bundle-sizes.mjs http://localhost:3000   # JS per route, gzipped (cap 200KB)
```

## Colour

Literal colour values exist in exactly two files, neither of which is under
`app/` or `components/`:

- `lib/tokens.data.mjs` — the source of truth
- `styles/tokens.css` — generated from it, do not edit

This holds:

```bash
grep -rE "#[0-9a-fA-F]{6}|rgb\(" components/ app/    # returns nothing
```

ESLint enforces the same rule, so a hardcoded colour or a Tailwind palette class
fails the build rather than quietly breaking one theme.

## Health

`GET /api/health` returns real state. Supabase is not wired until S5, so it
reports `supabase: not_configured` and the overall status derives to `degraded`.
`?simulate=degraded` and `?simulate=down` exercise the failure paths — neither
can report healthier than reality.
