import baseConfig from 'eslint-config-loderunner/base';
import formattingConfig from 'eslint-config-loderunner/formatting';
import importConfig from 'eslint-config-loderunner/import';
import jsdocConfig from 'eslint-config-loderunner/jsdoc';
import typescriptRules from 'eslint-config-loderunner/typescript/rules';
import vitestConfig from 'eslint-config-loderunner/vitest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'acceptance/vitest-project/**/*',
      'acceptance/jest-project/**/*',
      'acceptance/bun-project/**/*',
      'examples/**/*',
    ],
  },
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  ...baseConfig,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.{js,ts}'],
        },
      },
    },
  },
  { rules: typescriptRules },
  ...importConfig,
  ...jsdocConfig,
  ...vitestConfig.map((config) => ({
    ...config,
    files: ['src/**/*.test.ts'],
  })),
  {
    rules: {
      // Allow any for mock library flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  ...formattingConfig,
];
