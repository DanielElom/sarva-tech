# Launch runbook — Sarva Tech

Everything in this file is blocked on one thing: **the domain does not exist yet.**
Nothing here can be done, or usefully rehearsed, until it is registered.

Do the steps in the order given. The order is not cosmetic — step 6 bakes a value
into the JavaScript bundle, so anything that changes that value has to happen
before it, and the two email steps have a dependency that is easy to get backwards.

Throughout, `sarva.tech` stands for whatever domain is actually registered.
Replace it everywhere, including in the code change in step 7.

---

## Before you start

You need, in hand:

- the registrar login for the new domain,
- the Vercel account that owns the `sarva-tech` project,
- the Resend account that owns `RESEND_API_KEY`,
- a Google Workspace subscription, if the company mailbox is wanted.

The site is live and working at `sarva-tech.vercel.app` right now. None of the
steps below take it down. If a step goes wrong, the `.vercel.app` host keeps
serving the current build.

---

## 1. Register the domain

Register it. Nothing else.

Do not point it anywhere yet and do not buy the registrar's email, DNS or
"website" add-ons — Vercel provides DNS, and the mailbox comes from Google
Workspace in step 5.

## 2. Add the domain to Vercel

Vercel dashboard → the `sarva-tech` project → **Settings → Domains → Add**.

Add **both**:

- `sarva.tech`
- `www.sarva.tech`

Vercel will ask which is canonical. Choose `sarva.tech` as the primary and let it
configure `www` as a redirect to it. Picking the bare domain matters: it is the
value the whole site's canonical URLs, sitemap and OG image URLs will be built
from in step 6, and having `www` as primary would make every one of them a
redirect hop.

Vercel then shows the DNS records the domain needs.

## 3. Point DNS at Vercel

At the registrar, replace the nameservers or add the records Vercel showed you.
Vercel offers two routes and it does not matter much which you take:

- **Nameservers** (simpler): set the registrar's nameservers to the two Vercel
  gives you. Vercel then manages every record, including the Resend ones in
  step 4, from its own DNS panel.
- **Records** (keeps DNS at the registrar): add the `A` record for the apex and
  the `CNAME` for `www` exactly as shown.

Then wait. Propagation is usually minutes and occasionally hours. Vercel's
Domains page shows **Valid Configuration** when it is done, and issues the TLS
certificate automatically — there is nothing to buy or upload.

**Do not go on to step 4 until Vercel shows the domain as valid.** Resend
verification in the next step reads the same DNS, and checking it early just
produces a confusing failure.

## 4. Verify the sending domain in Resend

Resend dashboard → **Domains → Add Domain** → `sarva.tech`.

Resend shows a set of records — typically a `TXT` for DKIM, an `MX` and a `TXT`
for the return path, and optionally a DMARC `TXT`. Copy each one into wherever
DNS now lives: the Vercel DNS panel if you chose nameservers in step 3, the
registrar if you chose records.

Two things to watch:

- **Copy the values exactly.** A DKIM key that is line-wrapped by a copy and
  paste fails verification with no useful error.
- **Host names.** Some registrars want the subdomain only (`resend._domainkey`)
  and some want it fully qualified (`resend._domainkey.sarva.tech`). Entering
  the fully-qualified form into a field that already appends the domain produces
  `resend._domainkey.sarva.tech.sarva.tech`, which silently never verifies.

Press **Verify** and wait for the domain to go green.

Then, in Vercel → Settings → Environment Variables, set:

```
RESEND_FROM = Sarva Tech <hello@sarva.tech>
```

Until this is set, notifications send from `onboarding@resend.dev`, which only
delivers to the Resend account owner and lands in spam for anyone else. The code
already reads `RESEND_FROM` and falls back to the test address, so this is the
only change needed. The address does not need a real mailbox behind it to
_send_ — that is step 5's job, and it is why sending is verified first.

## 5. Google Workspace mailbox

Only after step 4 is green.

Create the Workspace account for `sarva.tech` and add its `MX` records to DNS.

**Careful:** Resend's return-path record in step 4 may also be an `MX` on a
subdomain such as `send.sarva.tech`. Google's `MX` records go on the **apex**.
They do not conflict, but deleting "the old MX records" while adding Google's is
the usual way this breaks. Only remove records you recognise as the registrar's
placeholder parking records.

Send a test message to the new address from an outside account and confirm it
arrives.

## 6. Set the canonical origin and rebuild

Vercel → Settings → Environment Variables → add for **Production**:

```
NEXT_PUBLIC_SITE_URL = https://sarva.tech
```

Include the scheme. No trailing slash. The code normalises a trailing slash away
and will throw a clear `SiteUrlError` at build time on a malformed value rather
than shipping a broken one.

**Then redeploy.** This is the step people miss. `NEXT_PUBLIC_*` variables are
inlined into the JavaScript bundle when the site is built, not read at runtime,
so saving the variable changes nothing on its own. Vercel → Deployments → the
most recent production deployment → **⋯ → Redeploy**.

Strictly speaking the site would resolve the right origin without this: once
`sarva.tech` is the production domain, Vercel sets `VERCEL_PROJECT_PRODUCTION_URL`
to it and the fallback chain in `lib/site.ts` picks it up. Set it explicitly
anyway — it costs nothing, it removes any doubt about which of the two values is
in play, and it is the only one of them visible to preview deployments.

What this value controls, all of which are wrong until it is right:

- every `<link rel="canonical">`,
- every `og:url`,
- the absolute URLs of all eight OG images,
- `sitemap.xml` and the `Sitemap:`/`Host:` lines in `robots.txt`,
- the `url` in the Organization JSON-LD.

## 7. Publish the email address in the site

One code change, once the mailbox from step 5 works.

In `lib/site.ts`:

```ts
export const CONTACT = {
  whatsappNumber: '+234 813 393 3217',
  whatsappUrl: 'https://wa.me/2348133933217',
  email: 'hello@sarva.tech', // was: null
} as const;
```

`email: null` is deliberate today — CLAUDE.md §11 forbids inventing one, and the
footer and contact page already branch on it, so setting a real value is all
that is needed to make the address appear in both places.

Commit and push. The GitHub integration deploys automatically.

## 8. Verify the launched site

Run the suite against the real domain:

```bash
node scripts/verify-ui.mjs https://sarva.tech
```

Against a non-localhost origin this additionally asserts that every canonical
resolves to the host being served — which is precisely the step 6 failure, and
the reason that check exists.

Then check by hand, because these are the things a suite cannot see:

- [ ] `https://sarva.tech` and `https://www.sarva.tech` both load, `www`
      redirecting to the apex, both on a valid certificate.
- [ ] Submit `/start` end to end. Confirm the row lands in Supabase **and** the
      notification arrives at the new mailbox, not in its spam folder.
- [ ] Submit `/contact`. Same two confirmations.
- [ ] Paste `https://sarva.tech` into a WhatsApp chat and confirm the card
      renders with the right image and title. Repeat for `/solutions` and
      `/about` — each has its own card. WhatsApp caches aggressively, so if a
      stale card appears, append `?v=2` to force a refetch.
- [ ] `https://sarva.tech/sitemap.xml` lists eight URLs, all on the new domain.
- [ ] `https://sarva.tech/robots.txt` points at the new sitemap.
- [ ] `https://sarva.tech/api/health` reports `supabase: ok`.

## 9. Submit to search engines

Google Search Console → add `sarva.tech` as a domain property (verification is a
`TXT` record) → **Sitemaps** → submit `sitemap.xml`.

This is last on purpose. Submitting before step 6 asks Google to index a site
whose every canonical URL points at `sarva-tech.vercel.app`, and undoing that
first impression is slower than waiting an hour to do it once.

---

## Still open after this runbook

These are not domain-blocked. They are decisions for the client.

- **Rate limiting is per-instance.** `lib/rate-limit.ts` counts submissions in
  one lambda's memory. Vercel runs several, so a burst spread across them can
  exceed the intended ceiling. It stops a script hammering the form, which is
  what it is for. If the form starts attracting real abuse, it needs a shared
  store — that is a change of a dozen lines, not an architecture.
- **The logo is a wordmark.** If a real mark is commissioned it replaces the
  contents of `components/chrome/logo.tsx` and the favicon block at the bottom
  of `scripts/generate-tokens.mjs`. Nothing else in the codebase refers to it.
- **The legal pages have not been reviewed by a lawyer.** They describe what the
  site actually does and claim nothing untrue, which is the part an engineer can
  be responsible for. Whether they are sufficient for Nigerian law, and for the
  NDPR in particular, is not something this project has verified.
- **Both themes have not been checked on a real Android device.** Everything so
  far is desktop Chrome and emulation.
