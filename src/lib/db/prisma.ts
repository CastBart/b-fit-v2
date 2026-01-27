import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Singleton
 * This ensures we don't create multiple instances of PrismaClient in development
 * which can exhaust database connections.
 *
 * Using library engine type which works with standard Node.js and doesn't require adapters.
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
