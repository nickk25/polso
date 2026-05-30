import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaNeon } from "@prisma/adapter-neon"

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const systemCategories = [
  // Fixed expenses
  { name: "Rent & Mortgage", slug: "rent-mortgage", color: "#ef4444", entryType: "fixed" },
  { name: "Utilities", slug: "utilities", color: "#f97316", entryType: "fixed" },
  { name: "Insurance", slug: "insurance", color: "#3b82f6", entryType: "fixed" },
  { name: "Subscriptions", slug: "subscriptions", color: "#8b5cf6", entryType: "fixed" },
  { name: "Salaries & Payroll", slug: "salaries-payroll", color: "#14b8a6", entryType: "fixed" },
  { name: "Loan Payments", slug: "loan-payments", color: "#64748b", entryType: "fixed" },

  // Variable expenses
  { name: "Office Supplies", slug: "office-supplies", color: "#06b6d4", entryType: "variable" },
  { name: "Marketing & Ads", slug: "marketing-ads", color: "#f43f5e", entryType: "variable" },
  { name: "Software & Tools", slug: "software-tools", color: "#6366f1", entryType: "variable" },
  { name: "Travel & Transport", slug: "travel-transport", color: "#22c55e", entryType: "variable" },
  { name: "Meals & Entertainment", slug: "meals-entertainment", color: "#eab308", entryType: "variable" },
  { name: "Professional Services", slug: "professional-services", color: "#a855f7", entryType: "variable" },
  { name: "Equipment", slug: "equipment", color: "#0ea5e9", entryType: "variable" },
  { name: "Miscellaneous", slug: "miscellaneous", color: "#94a3b8", entryType: "variable" },
]

async function main() {
  console.log("Seeding system categories...")

  for (const category of systemCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: category.slug,
        organizationId: null,
        isSystem: true,
      },
    })

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: category.name,
          color: category.color,
          entryType: category.entryType,
        },
      })
      console.log(`  Updated: ${category.name}`)
    } else {
      await prisma.category.create({
        data: {
          name: category.name,
          slug: category.slug,
          color: category.color,
          entryType: category.entryType,
          isSystem: true,
          organizationId: null,
        },
      })
      console.log(`  Created: ${category.name}`)
    }
  }

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
