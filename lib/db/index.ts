import { PrismaClient } from "@/lib/generated/prisma"
import { PrismaNeon } from "@prisma/adapter-neon"

// Create adapter with connection string
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

// Create Prisma client with adapter
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export { type PrismaClient } from "@/lib/generated/prisma"
