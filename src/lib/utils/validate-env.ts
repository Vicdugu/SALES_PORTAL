/**
 * Validates that all required environment variables are present at startup.
 * Call this as early as possible (e.g. in the DB client, layout, or a dedicated
 * startup module).  Throws on the first missing required variable so that
 * misconfigured deployments fail fast with a clear error rather than a
 * hard-to-diagnose runtime crash.
 */

interface EnvSpec {
  name: string;
  required: boolean;
  description: string;
}

const ENV_SPECS: EnvSpec[] = [
  // Auth
  { name: 'JWT_SECRET',               required: true,  description: 'JWT signing secret (min 32 chars)' },
  // Database
  { name: 'DATABASE_URL',             required: true,  description: 'Prisma PostgreSQL connection URL' },
  // Email
  { name: 'RESEND_API_KEY',           required: false, description: 'Resend API key for transactional email' },
  { name: 'EMAIL_FROM',               required: false, description: 'Sender address used for outbound email' },
  // App
  { name: 'NEXT_PUBLIC_APP_URL',      required: false, description: 'Public URL of the app (used in email links)' },
];

const MIN_JWT_SECRET_LENGTH = 32;

let validated = false;

export function validateEnvironment(): void {
  if (validated) return; // only run once per process

  const errors: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.name];

    if (spec.required && !value) {
      errors.push(`Missing required env var: ${spec.name} (${spec.description})`);
    }
  }

  // Additional strength checks
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET is too short (${jwtSecret.length} chars). Minimum ${MIN_JWT_SECRET_LENGTH} characters required.`
    );
  }

  if (errors.length > 0) {
    const msg = `[ENV] Fatal configuration errors:\n${errors.map(e => `  • ${e}`).join('\n')}`;
    console.error(msg);
    throw new Error(msg);
  }

  validated = true;
}
