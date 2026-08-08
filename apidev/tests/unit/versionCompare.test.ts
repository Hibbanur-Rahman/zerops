import { describe, expect, it } from 'vitest';
import { compareVersions } from '../../src/services/analysis/versionCompare.js';

describe('compareVersions', () => {
  it('detects an upgrade', () => {
    expect(compareVersions('4.18.2', '4.21.2')).toBe('upgrade');
  });

  it('detects a downgrade', () => {
    expect(compareVersions('4.21.2', '4.18.2')).toBe('downgrade');
  });

  it('returns unknown for identical versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe('unknown');
  });

  it('returns unknown for non-semver values instead of throwing', () => {
    expect(compareVersions('workspace:*', 'git+https://example.com/repo.git')).toBe('unknown');
  });
});
