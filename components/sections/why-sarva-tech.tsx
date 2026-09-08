import { Container } from '@/components/ui/container';

/**
 * Six principles.
 *
 * Six divides into a 3x2 grid, which is exactly the trap: six identical rounded
 * cards with identical shadows is the templated default, and it flattens six
 * different commitments into six interchangeable tiles.
 *
 * The hierarchy here is editorial rather than decorative. The heading holds its
 * own column and stays put while the principles scroll past it, so the section
 * reads as one argument with six parts rather than a grid of equals. Within each
 * principle the weight is carried by type: the commitment is set in the display
 * face at heading size, the explanation recedes to muted body. Hairlines
 * separate them. No fills, no shadows, no cards.
 *
 * No numbered markers either — this is a list of principles, not a sequence.
 * S2's problem-first section is the sequence, and numbering both would imply an
 * order here that does not exist.
 */

type Principle = { title: string; body: string };

const PRINCIPLES: Principle[] = [
  {
    title: 'Problem first',
    body: 'We understand the problem before we write the solution. Sometimes that conversation ends with us telling you not to build anything.',
  },
  {
    title: 'Built for reality',
    body: 'Software that works on a mid-range phone over patchy data, not just on the demo machine.',
  },
  {
    title: 'Scalable thinking',
    body: "Built to grow with you, so the thing that works for fifty users doesn't collapse at five thousand.",
  },
  {
    title: 'Human-centered',
    body: 'If people need training to use it, we designed it wrong.',
  },
  {
    title: 'Engineering and strategy',
    body: 'We think about your business, not just your ticket queue.',
  },
  {
    title: 'Long-term partnership',
    body: "We don't disappear after deployment. Launch is when the real information starts arriving.",
  },
];

export function WhySarvaTech() {
  return (
    <Container as="section" className="py-section" aria-labelledby="why-sarva-tech-heading">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="why-sarva-tech-heading" className="text-h2">
            Six things we hold to.
          </h2>
        </div>

        <ul className="flex flex-col">
          {PRINCIPLES.map((principle) => (
            <li
              key={principle.title}
              className="border-line border-t py-7 first:border-t-0 first:pt-0"
            >
              <h3 className="text-h4">{principle.title}</h3>
              <p className="measure text-muted mt-3">{principle.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
