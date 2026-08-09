// Side-effect module: sets the env vars src/config/env.ts requires, before any
// integration test dynamically imports app code. Import this first, always as
// `import '../integration/testEnv.js'` (no bindings), then dynamic-import the
// modules under test so they pick up these values at their own load time.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'integration-test-jwt-secret-not-real-0000';
process.env.ENCRYPTION_KEY ??= 'integration-test-encryption-key-32-chars-min';
process.env.GITHUB_WEBHOOK_SECRET ??= 'integration-test-webhook-secret';
process.env.GITHUB_APP_ID ??= 'test-app-id';
process.env.GITHUB_APP_PRIVATE_KEY ??= 'test-github-app-private-key-not-real';
process.env.GITHUB_CLIENT_ID ??= 'test-client-id';
process.env.GITHUB_CLIENT_SECRET ??= 'test-client-secret';
process.env.FRONTEND_URL ??= 'http://localhost:3000';
