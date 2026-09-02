import next from 'eslint-config-next';

/**
 * eslint-config-next 16 ships flat config directly — no FlatCompat wrapper.
 *
 * The second block is the enforcement arm of CLAUDE.md 4.3: a hardcoded colour
 * silently breaks one theme and is not noticed until launch, so it is a lint
 * error rather than a convention. lib/ and styles/ are outside the scope on
 * purpose — the token definitions live there.
 */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'styles/**'] },
  ...next,
  {
    // Scoped to TS files: that is where next/typescript registers the plugin.
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
          message:
            'Hardcoded colour. Colour reaches components only through tokens - see CLAUDE.md 4.3 and lib/tokens.ts.',
        },
        {
          selector: 'Literal[value=/rgba?\\(/]',
          message:
            'Hardcoded colour. Colour reaches components only through tokens - see CLAUDE.md 4.3 and lib/tokens.ts.',
        },
        {
          selector:
            'Literal[value=/(text|bg|border|fill|stroke|ring|outline|from|via|to|decoration|shadow|caret|divide)-(slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)/]',
          message:
            'Tailwind palette colour class. Use a token class (bg-surface-raised, text-accent-text, ...) - CLAUDE.md 4.3.',
        },
      ],
    },
  },
];

export default config;
