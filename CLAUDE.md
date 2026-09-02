# CLAUDE.md — Sarva Tech website

Read this file at the start of every session. It is the source of truth for stack,
conventions, and constraints. If a session prompt contradicts this file, stop and ask.

---

## 1. What this is

The official website for **Sarva Tech**, a technology company that identifies problems,
designs solutions, builds them, ships them, and keeps improving them.

The site is not a brochure. It is a demonstration. A visitor should finish it thinking
"these people can probably solve my problem," and the quality of the site itself is the
main evidence for that.

Central message, reinforced everywhere: **Sarva Tech solves problems with technology.**

Narrative order of the homepage:
problem → why Sarva Tech exists → what we solve → how we solve it → what we build →
proof → start a project.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js, App Router |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS, tokens only (see §4) |
| Motion | Motion (`motion/react`), imported per component |
| Content | MDX with typed frontmatter schemas |
| Data | Supabase (form submissions only, no CMS, no auth) |
| Email | Resend |
| Hosting | Vercel |
| Package manager | pnpm |

No database ORM, no backend service, no auth. Pages are static or ISR. The only server
code is route handlers under `app/api/`.

**Not in scope, ever, unless a future session says otherwise:** client dashboard,
authentication, project tracking, marketplace, e-commerce. Do not add abstraction layers
in anticipation of them.

---

## 3. Repo structure

```
app/
  (site)/            marketing routes
    page.tsx         home
    services/
    solutions/
    work/
    about/
    contact/
  start/             project intake flow
  api/
    health/          real status endpoint, see §8
    intake/          form submission handler
components/
  ui/                buttons, inputs, links, primitives
  sections/          homepage sections, one file each
  motion/            motion primitives + useReducedMotion wrapper
  chrome/            nav, footer, logo, theme toggle
content/
  solutions/*.mdx
  work/*.mdx
lib/
  tokens.ts          typed token access
  schemas.ts         zod schemas for MDX frontmatter and forms
```

One section per file. No god components. A homepage section must be removable by deleting
its import without touching anything else.

---

## 4. Design system

### 4.1 Theme model

The site has a day and a night theme. **Do not think in "dark sections" and "light
sections."** Surfaces are defined by role and resolve per theme:

| Token | Night | Day |
|---|---|---|
| `surface-base` | `#001D13` | `#F5F2EC` |
| `surface-raised` | `#022C1E` | `#FFFFFF` |
| `surface-frame` | `#121F1D` | `#E4E0D7` |
| `surface-inverted` | resolves to the day base | resolves to the night base |

`surface-inverted` is how the brief's requested rhythm between dark and light sections
survives a theme toggle. A section marked inverted flips against whatever theme is
active, so the contrast rhythm holds in both.

Theme follows the visitor's system preference on first load, with a manual toggle
persisted to `localStorage`. No flash of wrong theme on load.

### 4.2 Colour

| Token | Night | Day |
|---|---|---|
| `text-primary` | `#E8F3EE` | `#08241A` |
| `text-muted` | `#8BA099` | `#4A5B52` |
| `accent` (fills) | `#F59B02` | `#F59B02` |
| `accent-text` (text, icons, borders, focus) | `#F59B02` | `#986001` |
| `on-accent` (text on an accent fill) | `#0A1410` | `#0A1410` |

**`accent` is a fill colour only.** `#F59B02` measures 1.96:1 against the day background.
Using it for text, icons, thin borders, or focus rings in day mode is a contrast failure.
Text uses `accent-text`, which resolves to the darker value in day mode.

### 4.3 Hard rule: no literal colours

No hex value, no `rgb()`, no Tailwind palette class (`text-amber-500`, `bg-green-900`)
appears in any component. Colour reaches components only through tokens. A single
hardcoded value silently breaks one theme, and it will not be noticed until launch.

Check this every session. `grep -rE "#[0-9a-fA-F]{6}" components/ app/` should return
nothing outside the token definition file.

### 4.4 Measured contrast floors

These are verified, not estimated. Nothing may be lightened or darkened below them for
aesthetic reasons.

Night, against `#001D13`: `text-primary` 15.60:1, `text-muted` 6.40:1, `accent` 8.08:1.
Day, against `#F5F2EC`: `text-primary` 14.71:1, `text-muted` 6.46:1, `accent-text` 4.69:1.
Accent fill with `on-accent` text: 8.54:1.

Two values in the original design run tight and have no headroom: inactive nav links
(4.65:1) and the status line (4.61:1). Both pass AA. Neither may be dimmed further.

Minimums: 4.5:1 body text, 3:1 large text and UI borders, 3:1 focus indicators.

### 4.5 Type

| Role | Face | Notes |
|---|---|---|
| Display and headings | Space Grotesk | Mechanical character, suits the instrument feel |
| Body | Inter | Holds up at small sizes on mid-range Android |
| Technical labels | JetBrains Mono | Reserved, see §4.6 |

All three self-hosted via `next/font`. No external font requests, no layout shift.

Body line length caps at 72 characters. Headline leading is tight, body leading is
generous. Set a modular scale in the token file and use it, no arbitrary `text-[27px]`.

### 4.6 The systems-readout language

The mockup uses monospace labels, tracked-out caps, and technical strings
(`SYS.ARCH_V.09`, `NODE_ACTIVE`, `Systems Nominal`). Scattered across a site, that
vocabulary is generic template chrome. Here it earns its place because it is one
consistent language, so it must stay disciplined:

Monospace, tracked caps, and technical strings are reserved for the systems-readout layer:
the hero panel chrome, the live status line, technology labels, and case-study metrics.
They do not appear on body copy, headings, buttons, navigation, or form labels.

If it does not read as instrumentation, it does not get the mono treatment.

---

## 5. Motion

Animation is central to the brief, but a blanket fade-and-slide-up on every section is the
default that reads as generated. Rules:

- Every animation communicates something: relationship, progress, transformation, cause
  and effect, or state change. Decoration is cut.
- Spend boldness in one place per page. The homepage's memorable moment is the hero. Other
  sections stay quiet.
- Motion that answers a user action (open, expand, select, confirm) is always welcome.
  Non-user-triggered motion is rationed.
- `prefers-reduced-motion: reduce` disables all non-essential motion. Content must be fully
  readable and every flow completable with motion off. Test this every session.
- Motion imports are per component. Never a global import.

### Animation budget

- Hero visual: SVG or lightweight canvas, ≤40KB, paused when off-screen via
  `IntersectionObserver`, replaced by a static composition below 768px.
- Cursor effects and magnetic buttons are desktop-only, behind a pointer query. They buy
  nothing on touch devices.
- No animation may run continuously off-screen or when the tab is hidden.

---

## 6. Performance

Most visitors will open this on a mid-range Android phone over mobile data in Nigeria. The
site makes its first argument in the first three seconds, and a stuttering hero loses it.

Checked at the end of **every** session, not once at launch:

- Lighthouse mobile performance ≥ 90
- LCP < 2.5s, CLS < 0.1, INP < 200ms
- No route ships more than 200KB of JavaScript, gzipped
- Images via `next/image`, explicit dimensions, modern formats
- Below-fold heavy components dynamically imported

---

## 7. Accessibility

- Semantic HTML. Landmarks. One `h1` per page, no skipped heading levels.
- Every interactive element reachable and operable by keyboard, with a visible focus ring
  using `accent-text`.
- The intake flow (§9) is completable end to end by keyboard alone.
- Form errors are associated with their inputs and announced.
- All imagery has meaningful alt text. Decorative visuals are `aria-hidden`.
- Reduced motion respected, per §5.

---

## 8. The status line is real

The hero status indicators (`Systems Nominal`, `API Connected`) are **not decoration**.
They read from `GET /api/health`, which checks the Supabase connection and returns real
state. Green when up, degraded when not.

On a site arguing that Sarva Tech knows how to build, a fake status readout is a puncture
in exactly the wrong place. A developer visitor will check. Keep it honest.

---

## 9. Forms

Two entry points, deliberately different:

- **`/start`** — the guided five-step project intake. Every "Start a Project" CTA lands
  here. It should feel like product onboarding, not a contact form.
- **`/contact`** — a short message form, plus direct WhatsApp and email.

Contact is deliberately absent from the primary navigation so it does not compete with
"Start a Project." It is reachable from the footer and the end of the intake flow.

### Submission handling

1. Write to Supabase **first**. The table is the source of truth.
2. Then send the notification email via Resend.

If email fails, the lead survives. Email alone is fragile, and a notification lost to a
spam folder is a lead lost with no record.

Every form: zod validation shared between client and server, honeypot field, rate limiting
by IP, explicit loading state, explicit success state, and an error state that says what
went wrong and what to do next. Errors do not apologise and are never vague.

---

## 10. Copy

Clear, human, confident, concise. Written for the person reading, not the system being
described.

Banned: corporate jargon, "leverage," "cutting-edge," "synergies," "digital
transformation" as a slogan, and any sentence that could appear unchanged on another
company's website.

CTAs name the action. "Start a Project," "Explore What We Build," "See How We Work."
Never "Learn More," "Click Here," "Submit," or "Discover."

An action keeps the same name through a whole flow: the button that says "Start a Project"
leads to a page headed "Start a Project."

---

## 11. Contact details

- WhatsApp: `+234 813 393 3217` → `wa.me/2348133933217`
- Email: pending, set when the domain and Google Workspace are live
- Social: none yet. Do not add empty social icons.
- Physical address: none yet. Do not invent one.

Footer copyright year is generated at build time, never typed.

---

## 12. Sessions

| Session | Scope | Status |
|---|---|---|
| S1 | Foundation: tokens, themes, type, motion primitives, nav, footer, route skeleton, health endpoint, Vercel deploy | not started |
| S2 | Homepage part 1: hero + interactive visual, what we do, problem-first section | not started |
| S3 | Homepage part 2: services ecosystem, process timeline, technology ecosystem, why Sarva Tech, conversion footer | not started |
| S4 | Content layer: MDX schemas, solutions and work listing + detail, four real case studies | not started |
| S5 | Intake and contact: five-step flow, Supabase, Resend, spam protection, contact page | not started |
| S6 | About, SEO, OG images, sitemap, structured data, legal pages, a11y audit, launch | not started |

A copy pass happens between S1 and S2. Layout follows copy, and inventing placeholder copy
in S2 means rebuilding sections later when the real words are a different length.

Each session ends with a REPORT STATUS block: summary, files created and changed, commands
and walkthrough, definition-of-done checklist with each item marked, deviations and
assumptions, and confirmation of readiness for the next session without starting it.

---

## 13. Before launch

- [ ] Domain registered and pointed at Vercel
- [ ] Resend sending domain verified via DNS, real delivery tested to an external inbox
- [ ] Google Workspace mailbox live, address wired into footer and contact page
- [ ] Supabase intake table has row-level security, anon key cannot read submissions
- [ ] Privacy policy written, personal data collection disclosed
- [ ] Terms of service written
- [ ] Real logo replaces the wordmark, or the wordmark is confirmed as final
- [ ] Four case studies published with client permission confirmed for each named client
- [ ] Lighthouse mobile ≥ 90 on every route
- [ ] Both themes audited on a real Android device, not just a desktop emulator
- [ ] Reduced-motion pass on every page
- [ ] `grep` for hardcoded colours returns nothing
- [ ] 404 and error pages designed, not framework defaults
- [ ] OG images render correctly when a link is shared to WhatsApp
