import { PrismaClient } from "./generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

if (!process.env.DATABASE_URL) {
  throw new Error("@polso/db: DATABASE_URL is not set")
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})

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
