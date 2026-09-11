import 'server-only';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { solutionFrontmatterSchema, type SolutionFrontmatter } from './schemas';

/**
 * The solutions content collection.
 *
 * MDX files with typed frontmatter (CLAUDE.md 2, 3). Read and validated at BUILD
 * time: `next build` prerenders the pages that call this, so a malformed entry
 * throws during the build rather than rendering something broken or, worse,
 * rendering half of it. The error names the file and the field.
 *
 * Validation is zod/mini and lives entirely on the server — it is never in any
 * client payload, first-paint or deferred, which is the rule in CLAUDE.md 6 taken
 * to its conclusion.
 */
export type Solution = SolutionFrontmatter & {
  /** Derived from the filename — the anchor and the ordering key. */
  slug: string;
  /** Prose after the frontmatter. Optional; the fields carry the substance. */
  body: string;
};

const CONTENT_DIR = join(process.cwd(), 'content', 'solutions');

function loadAll(): Solution[] {
  let files: string[];
  try {
    files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));
  } catch {
    throw new Error(
      `No solutions content directory at ${CONTENT_DIR}. Expected MDX entries there.`,
    );
  }

  if (files.length === 0) {
    throw new Error(`No .mdx entries in ${CONTENT_DIR}. /solutions would render empty.`);
  }

  const solutions = files.map((file) => {
    const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    const parsed = solutionFrontmatterSchema.safeParse(data);

    if (!parsed.success) {
      const problems = parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `Invalid frontmatter in content/solutions/${file}:\n${problems}\n` +
          'Fix the entry; the build will not render a broken solution.',
      );
    }

    return {
      ...parsed.data,
      slug: file.replace(/\.mdx$/, ''),
      body: content.trim(),
    };
  });

  const slugs = new Set(solutions.map((s) => s.slug));
  if (slugs.size !== solutions.length) {
    throw new Error('Duplicate solution slugs in content/solutions.');
  }

  return solutions.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function getSolutions(): Solution[] {
  return loadAll();
}

/** The homepage preview shows the first two, from the same source as /solutions. */
export function getFeaturedSolutions(limit = 2): Solution[] {
  return loadAll().slice(0, limit);
}
