import { z } from 'zod';

const booleanish = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  MONGODB_URI: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  OSV_API_URL: z.string().url().default('https://api.osv.dev'),
  NPM_REGISTRY_URL: z.string().url().default('https://registry.npmjs.org'),
  GITHUB_GRAPHQL_URL: z.string().url().default('https://api.github.com/graphql'),
  GITHUB_API_URL: z.string().url().default('https://api.github.com'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Package Risk Analyzer <notifications@example.com>'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be set and at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be set and at least 32 characters'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DISABLE_INLINE_WORKERS: booleanish,
  FULL_SCAN_DEFAULT: booleanish,
});

export type Env = z.infer<typeof envSchema> & {
  isProduction: boolean;
  isTest: boolean;
  githubAppPrivateKey: string | undefined;
  github: {
    configured: boolean;
  };
  email: {
    configured: boolean;
  };
};

/**
 * GitHub App private keys are PEM blocks. Depending on how the operator's secret
 * store hands the value to us it may arrive as a real multi-line PEM, a single line
 * with literal "\n" escapes, or base64-encoded. Accept all three.
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let value = raw.trim();

  if (!value.includes('BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(value)) {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      if (decoded.includes('BEGIN')) value = decoded;
    } catch {
      // not base64 -- fall through and use the raw value
    }
  }

  if (value.includes('\\n')) {
    value = value.replace(/\\n/g, '\n');
  }

  return value;
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration -- see stderr for details');
  }

  const data = parsed.data;
  const githubAppPrivateKey = normalizePrivateKey(data.GITHUB_APP_PRIVATE_KEY);
  const githubConfigured = Boolean(
    data.GITHUB_APP_ID && githubAppPrivateKey && data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET && data.GITHUB_WEBHOOK_SECRET,
  );

  return {
    ...data,
    isProduction: data.NODE_ENV === 'production',
    isTest: data.NODE_ENV === 'test',
    githubAppPrivateKey,
    github: { configured: githubConfigured },
    email: { configured: Boolean(data.RESEND_API_KEY) },
  };
}

export const env = loadEnv();
