import { describe, expect, it } from 'vitest';
import { parsePackageJson } from '../../src/services/analysis/manifestParser.js';

describe('parsePackageJson', () => {
  it('extracts dependency fields and install scripts', () => {
    const manifest = parsePackageJson(
      JSON.stringify({
        name: 'example',
        dependencies: { express: '^4.18.2' },
        devDependencies: { vitest: '^2.0.0' },
        optionalDependencies: { fsevents: '^2.3.0' },
        scripts: { build: 'tsc', postinstall: 'node install.js' },
      }),
    );

    expect(manifest.name).toBe('example');
    expect(manifest.dependencies).toEqual({ express: '^4.18.2' });
    expect(manifest.devDependencies).toEqual({ vitest: '^2.0.0' });
    expect(manifest.optionalDependencies).toEqual({ fsevents: '^2.3.0' });
    expect(manifest.scripts.postinstall).toBe('node install.js');
    expect(manifest.scripts.preinstall).toBeUndefined();
  });

  it('defaults missing dependency fields to empty objects', () => {
    const manifest = parsePackageJson(JSON.stringify({ name: 'bare' }));
    expect(manifest.dependencies).toEqual({});
    expect(manifest.devDependencies).toEqual({});
    expect(manifest.peerDependencies).toEqual({});
    expect(manifest.optionalDependencies).toEqual({});
  });

  it('throws AppError on invalid JSON', () => {
    expect(() => parsePackageJson('{not json')).toThrow(/Invalid package\.json/);
  });
});
