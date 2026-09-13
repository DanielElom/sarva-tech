import { CONTACT, SITE } from '@/lib/site';

/**
 * Organization structured data, site-wide.
 *
 * CLAUDE.md 11 governs what may appear here. Only facts that are true and
 * publishable are included: name, URL, description, and the WhatsApp number,
 * which is the one contact route that actually exists. Deliberately absent —
 * and none of these may be added until they are real:
 *
 *   - `address` / `areaServed` as a postal address. There is no office.
 *   - `foundingDate`. Not published.
 *   - `numberOfEmployees`. Not published.
 *   - `sameAs`. There are no social accounts, and an empty or invented profile
 *     link is the kind of claim a structured-data consumer treats as fact.
 *   - `logo`. Google expects a real raster logo of a minimum size; the mark is
 *     currently a wordmark rendered in type, and pointing this at the favicon
 *     would be asserting something that is not a logo file.
 *
 * A crawler treats JSON-LD as machine-readable claims about the company, so
 * anything padded in here is a lie told in a format designed to be trusted.
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    slogan: SITE.tagline,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: CONTACT.whatsappNumber,
        url: CONTACT.whatsappUrl,
        availableLanguage: ['English'],
      },
    ],
  };

  /*
   * `</script>` inside a JSON string would close this block early. The content
   * is static today, but the escape costs nothing and means a future edit that
   * interpolates copy cannot open an injection hole here.
   */
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // JSON-LD has no insertion point other than innerHTML; the value is escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
