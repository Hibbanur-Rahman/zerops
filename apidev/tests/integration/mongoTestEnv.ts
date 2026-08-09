export interface TestMongo {
  uri: string;
  teardown: () => Promise<void>;
}

/**
 * Resolves a real MongoDB to run integration tests against. Prefers an
 * explicit TEST_MONGODB_URI (a real, disposable database -- never the app's
 * own MONGODB_URI, so a test run can never touch real data). Falls back to
 * mongodb-memory-server for a zero-config ephemeral instance, which works on
 * a normal glibc dev machine or CI image.
 *
 * Returns null when neither is available so callers can skip cleanly instead
 * of failing: there is no official MongoDB build for Alpine (this project's
 * Zerops runtime/build image), and mongodb-memory-server's own OS detection
 * throws before attempting a download there. See the
 * mongodb-memory-server-alpine-incompatible memory for the full trail
 * (gcompat + a manually downloaded glibc mongod still fails on missing
 * symbols) -- don't re-attempt that workaround.
 */
export async function resolveTestMongo(): Promise<TestMongo | null> {
  if (process.env.TEST_MONGODB_URI) {
    return { uri: process.env.TEST_MONGODB_URI, teardown: async () => {} };
  }

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    return {
      uri: mongod.getUri(),
      teardown: async () => {
        await mongod.stop();
      },
    };
  } catch (err) {
    console.warn(
      '[integration] No MongoDB available (mongodb-memory-server unsupported on this OS and ' +
        'TEST_MONGODB_URI is not set) -- skipping Mongo-backed integration tests.',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
