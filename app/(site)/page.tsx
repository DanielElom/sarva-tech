import { Hero } from '@/components/sections/hero';
import { WhatWeDo } from '@/components/sections/what-we-do';
import { ProblemFirst } from '@/components/sections/problem-first';
import { WhySarvaTech } from '@/components/sections/why-sarva-tech';
import { TechnologyEcosystem } from '@/components/sections/technology-ecosystem';

/**
 * Homepage. CLAUDE.md 1: problem -> why Sarva Tech exists -> what we solve ->
 * how we solve it -> what we build -> start a project.
 *
 * Surface rhythm across the page is N N I N I I: the two inverted passages are
 * the problem-first section and the closing pair of technology + footer. See
 * the S3 report for why the technology section takes the inversion rather than
 * "Why Sarva Tech".
 *
 * Each section is removable by deleting its import, per CLAUDE.md 3.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <WhatWeDo />
      <ProblemFirst />
      <WhySarvaTech />
      <TechnologyEcosystem />
    </>
  );
}
