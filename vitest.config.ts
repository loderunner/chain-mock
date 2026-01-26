import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          include: ['src/**/*.test-d.ts'],
          typecheck: {
            enabled: true,
          },
        },
      },
    ],
  },
});
