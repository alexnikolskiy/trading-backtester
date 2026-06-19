import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  license?: string;
  exports: Record<string, unknown>;
  files: string[];
}

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageJson;

describe('@trading-backtester/sdk package shape', () => {
  it('is public, licensed and exposes only the approved entrypoints', () => {
    expect(pkg.name).toBe('@trading-backtester/sdk');
    expect(pkg.version).toBe('0.1.0');
    expect(pkg.private).not.toBe(true);
    expect(pkg.license).toBe('Apache-2.0');
    expect(Object.keys(pkg.exports).sort()).toEqual([
      '.',
      './artifacts',
      './builder',
      './client',
      './contracts',
    ]);
    expect(pkg.files.sort()).toEqual(['LICENSE', 'README.md', 'dist', 'schemas']);
  });
});
