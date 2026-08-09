import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share live external state (the real project Redis --
    // there's no MongoDB equivalent to mongodb-memory-server on this
    // platform's Alpine image, see the integration test setup). Running test
    // files in parallel lets one file's worker claim another file's job on
    // the same real queue. Unit tests don't need this, but the whole suite
    // is small enough that running it file-by-file costs very little.
    fileParallelism: false,
  },
});
