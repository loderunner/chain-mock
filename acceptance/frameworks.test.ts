import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { GenericContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('framework acceptance tests', () => {
  let tarballPath: string;

  beforeAll(() => {
    // When running tests, process.cwd() is the project root
    const rootDir = process.cwd();

    // Build the library first
    execSync('pnpm build', { cwd: rootDir });

    // Pack the library
    const packOutput = execSync('pnpm pack', {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    const tarballName = packOutput.trim().split('\n').pop()?.split(' ').pop();
    if (tarballName === undefined || tarballName === '') {
      throw new Error('Failed to get tarball name from pnpm pack');
    }
    tarballPath = resolve(rootDir, tarballName);

    if (!existsSync(tarballPath)) {
      throw new Error(`Tarball not found at ${tarballPath}`);
    }
  });

  afterAll(() => {
    // Clean up tarball
    if (existsSync(tarballPath)) {
      try {
        execSync(`rm -f "${tarballPath}"`);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it.concurrent('vitest framework works correctly', async () => {
    const projectDir = resolve(process.cwd(), 'acceptance', 'vitest-project');
    const container = await new GenericContainer('node:24-alpine')
      .withCopyDirectoriesToContainer([
        { source: projectDir, target: '/project' },
      ])
      .withCopyFilesToContainer([
        { source: tarballPath, target: '/project/chain-mock-0.1.0.tgz' },
      ])
      .withWorkingDir('/project')
      .withCommand(['sleep', 'infinity'])
      .start();

    try {
      // Install dependencies
      const installResult = await container.exec([
        'sh',
        '-c',
        'npm install --no-audit --no-fund',
      ]);
      expect(
        installResult.exitCode,
        `expected exit code to be 0, but got ${installResult.exitCode}\n${installResult.output}`,
      ).toBe(0);

      // Type check
      const typecheckResult = await container.exec([
        'sh',
        '-c',
        'npx tsc --noEmit',
      ]);
      expect(
        typecheckResult.exitCode,
        `expected exit code to be 0, but got ${typecheckResult.exitCode}\n${typecheckResult.output}`,
      ).toBe(0);

      // Run tests
      const testResult = await container.exec(['npm', 'test']);
      expect(
        testResult.exitCode,
        `expected exit code to be 0, but got ${testResult.exitCode}\n${testResult.output}`,
      ).toBe(0);
    } finally {
      await container.stop();
    }
  });

  it.concurrent('jest framework works correctly', async () => {
    const projectDir = resolve(process.cwd(), 'acceptance', 'jest-project');
    const container = await new GenericContainer('node:24-alpine')
      .withCopyDirectoriesToContainer([
        { source: projectDir, target: '/project' },
      ])
      .withCopyFilesToContainer([
        { source: tarballPath, target: '/project/chain-mock-0.1.0.tgz' },
      ])
      .withWorkingDir('/project')
      .withCommand(['sleep', 'infinity'])
      .start();

    try {
      // Install dependencies
      const installResult = await container.exec([
        'sh',
        '-c',
        'npm install --no-audit --no-fund',
      ]);
      expect(
        installResult.exitCode,
        `expected exit code to be 0, but got ${installResult.exitCode}\n${installResult.output}`,
      ).toBe(0);

      // Type check
      const typecheckResult = await container.exec([
        'sh',
        '-c',
        'npx tsc --noEmit',
      ]);
      expect(
        typecheckResult.exitCode,
        `expected exit code to be 0, but got ${typecheckResult.exitCode}\n${typecheckResult.output}`,
      ).toBe(0);

      // Run tests
      const testResult = await container.exec(['npm', 'test']);
      expect(
        testResult.exitCode,
        `expected exit code to be 0, but got ${testResult.exitCode}\n${testResult.output}`,
      ).toBe(0);
    } finally {
      await container.stop();
    }
  });

  it.concurrent('bun framework works correctly', async () => {
    const projectDir = resolve(process.cwd(), 'acceptance', 'bun-project');
    const container = await new GenericContainer('oven/bun:latest')
      .withCopyDirectoriesToContainer([
        { source: projectDir, target: '/project' },
      ])
      .withCopyFilesToContainer([
        { source: tarballPath, target: '/project/chain-mock-0.1.0.tgz' },
      ])
      .withWorkingDir('/project')
      .withCommand(['sleep', 'infinity'])
      .start();

    try {
      // Install dependencies
      const installResult = await container.exec([
        'sh',
        '-c',
        'bun install --no-save',
      ]);
      expect(
        installResult.exitCode,
        `expected exit code to be 0, but got ${installResult.exitCode}\n${installResult.output}`,
      ).toBe(0);

      // Type check
      const typecheckResult = await container.exec([
        'sh',
        '-c',
        'bunx tsc --noEmit',
      ]);
      expect(
        typecheckResult.exitCode,
        `expected exit code to be 0, but got ${typecheckResult.exitCode}\n${typecheckResult.output}`,
      ).toBe(0);

      // Run tests
      const testResult = await container.exec(['bun', 'test']);
      expect(
        testResult.exitCode,
        `expected exit code to be 0, but got ${testResult.exitCode}\n${testResult.output}`,
      ).toBe(0);
    } finally {
      await container.stop();
    }
  });
});
