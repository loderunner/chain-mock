import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Builds and packs the library, returning the tarball path.
 */
export function setup() {
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
  const tarballPath = resolve(rootDir, tarballName);

  if (!existsSync(tarballPath)) {
    throw new Error(`Tarball not found at ${tarballPath}`);
  }

  return tarballPath;
}

/**
 * Cleans up the tarball created by setup.
 */
export function teardown(tarballPath: string) {
  // Clean up tarball
  if (existsSync(tarballPath)) {
    try {
      execSync(`rm -f "${tarballPath}"`);
    } catch {
      // Ignore cleanup errors
    }
  }
}
