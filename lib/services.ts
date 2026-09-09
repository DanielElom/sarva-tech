/**
 * The five service categories, in full.
 *
 * The homepage introduces these in a sentence each; this is the version someone
 * reads when they want to know what they would actually be buying. Four fields
 * per category, the same four every time, so the five can be compared rather
 * than just read.
 */

export type Service = {
  /** Stable id — used for the in-page anchor and the ecosystem map. */
  id: string;
  name: string;
  /** Short label for the map node, where the full name will not fit. */
  short: string;
  solves: string;
  deliver: string;
  builtWith: string;
  outcome: string;
};

export const SERVICES: readonly Service[] = [
  {
    id: 'product-development',
    name: 'Product development',
    short: 'Product',
    solves: 'You know what you need built and need people who can actually build it.',
    deliver: 'Web and mobile applications, SaaS platforms, MVPs, custom internal software.',
    builtWith: 'React, Next.js, React Native, Node.js, NestJS, PostgreSQL.',
    outcome:
      "A working product in real users' hands, with the code and knowledge staying yours.",
  },
  {
    id: 'technology-strategy',
    name: 'Technology strategy',
    short: 'Strategy',
    solves:
      'You have a goal and competing opinions about what to build, and every option is expensive.',
    deliver:
      'Product strategy, technical architecture, technology roadmaps, build-versus-buy analysis.',
    builtWith: 'Discovery sessions, technical review, architecture design.',
    outcome:
      'A decision you can defend, and a plan with the risky parts identified before they cost money.',
  },
  {
    id: 'rescue-and-optimization',
    name: 'Rescue and optimization',
    short: 'Rescue',
    solves:
      'Something you already paid for is slow, breaking, or was abandoned half-finished.',
    deliver:
      'Legacy system work, performance fixes, bug resolution, taking over stalled projects.',
    builtWith: 'Profiling, code audit, incremental refactoring, test coverage.',
    outcome:
      'A system that works, and an honest assessment of whether fixing beats rebuilding.',
  },
  {
    id: 'digital-infrastructure',
    name: 'Digital infrastructure',
    short: 'Infrastructure',
    solves:
      'It works on one machine and nobody is confident about what happens under load.',
    deliver:
      'Cloud setup, APIs, database design, third-party integrations, deployment pipelines.',
    builtWith: 'AWS, Vercel, Docker, PostgreSQL, Redis, CI/CD.',
    outcome:
      'Infrastructure that holds up, and deployments that do not require holding your breath.',
  },
  {
    id: 'technology-talent',
    name: 'Technology talent',
    short: 'Talent',
    solves: 'You need more engineering capacity than you have, and hiring takes months.',
    deliver:
      'Engineers at the level the work needs, from interns for well-scoped tasks through senior developers who can lead.',
    builtWith: 'Screening, onboarding, ongoing technical oversight.',
    outcome: 'Capacity when you need it, without a permanent headcount decision.',
  },
];
