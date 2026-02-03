import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      'acceptance/vitest-project/**/*',
      'acceptance/jest-project/**/*',
      'acceptance/bun-project/**/*',
      'examples/**/*',
    ],
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
      {
        extends: true,
        test: {
          name: 'acceptance',
          include: ['acceptance/*.test.ts'],
          testTimeout: 120000,
        },
      },
    ],
    // Acceptance tests are slow, so we give them a longer timeout
    slowTestThreshold: 30000,
  },
});
