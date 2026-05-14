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

// Export a getter to ensure lazy initialization
export const prisma = new Proxy<PrismaClient>({} as PrismaClient, {
  get: (target, prop) => {
    const client = getPrisma();
    return Reflect.get(client, prop);
  },
});

export default prisma;