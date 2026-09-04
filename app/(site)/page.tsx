import { Hero } from '@/components/sections/hero';
import { WhatWeDo } from '@/components/sections/what-we-do';
import { ProblemFirst } from '@/components/sections/problem-first';

/**
 * Homepage, S2 portion of the narrative (CLAUDE.md 1):
 * problem -> why Sarva Tech exists -> what we solve.
 *
 * The services ecosystem, process timeline, technology ecosystem and
 * "Why Sarva Tech" are S3. Each section below is removable by deleting its
 * import, per CLAUDE.md 3.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <WhatWeDo />
      <ProblemFirst />
    </>
  );
}
