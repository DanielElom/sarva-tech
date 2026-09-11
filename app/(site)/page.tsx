import { Hero } from '@/components/sections/hero';
import { WhatWeDo } from '@/components/sections/what-we-do';
import { ProblemFirst } from '@/components/sections/problem-first';
import { WhySarvaTech } from '@/components/sections/why-sarva-tech';
import { TechnologyEcosystem } from '@/components/sections/technology-ecosystem';
import { SolutionsPreview } from '@/components/sections/solutions-preview';

/**
 * Homepage. CLAUDE.md 1: problem -> why Sarva Tech exists -> what we solve ->
 * how we solve it -> what we build -> start a project.
 *
 * Surface rhythm is N N I N I N I. The solutions preview sits between the
 * technology band and the footer band, which is the point of putting it there:
 * those two were adjacent and merged into one long inverted passage, and a
 * normal section between them restores the alternation while giving the proof
 * step its own ground. Three inverted scopes: problem-first, technology, footer.
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
      <SolutionsPreview />
    </>
  );
}
