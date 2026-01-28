import { resolve } from 'node:path';

import { GenericContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setup, teardown } from './setup-teardown';

describe.concurrent('examples acceptance tests', () => {
  let tarballPath: string;

  beforeAll(() => {
    tarballPath = setup();
  });

  afterAll(() => teardown(tarballPath));

  it.concurrent('examples works correctly', async () => {
    const projectDir = resolve(process.cwd(), 'examples');
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
});
