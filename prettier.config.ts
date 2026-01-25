import type { Config } from 'prettier';

export default {
  singleQuote: true,
  overrides: [
    {
      files: '**/*.md',
      options: {
        proseWrap: 'always',
      },
    },
  ],
} satisfies Config;
