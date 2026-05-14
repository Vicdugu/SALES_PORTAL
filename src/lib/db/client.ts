import { PrismaClient } from '@prisma/client';
import { validateEnvironment } from '@/lib/utils/validate-env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  validateEnvironment();

  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

// Restricted Prisma client that connects as a role without BYPASSRLS,
// enabling actual enforcement of Row-Level Security policies.
// Falls back to the main client if DATABASE_URL_RLS is not configured.
let rlsPrismaInstance: PrismaClient | null = null;

export function getRlsPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL_RLS) {
    // No restricted role configured — fall back to main client.
    // RLS policies are defined but not enforced in this mode.
    return getPrisma();
  }

  if (rlsPrismaInstance) {
    return rlsPrismaInstance;
  }

  rlsPrismaInstance = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_RLS } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return rlsPrismaInstance;
}

// Export a getter to ensure lazy initialization
export const prisma = new Proxy<PrismaClient>({} as PrismaClient, {
  get: (target, prop) => {
    const client = getPrisma();
    return Reflect.get(client, prop);
  },
});

export default prisma;