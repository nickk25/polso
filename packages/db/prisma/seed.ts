import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaNeon } from "@prisma/adapter-neon"

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const systemCategories = [
  // Gastos fijos
  { name: "Alquiler", slug: "rent-mortgage", color: "#ef4444", entryType: "fixed", accountCode: "621" },
  { name: "Suministros", slug: "utilities", color: "#f97316", entryType: "fixed", accountCode: "628" },
  { name: "Seguros", slug: "insurance", color: "#3b82f6", entryType: "fixed", accountCode: "625" },
  { name: "Suscripciones", slug: "subscriptions", color: "#8b5cf6", entryType: "fixed", accountCode: "629" },
  { name: "Sueldos y nómina", slug: "salaries-payroll", color: "#14b8a6", entryType: "fixed", accountCode: "640" },
  { name: "Préstamos", slug: "loan-payments", color: "#64748b", entryType: "fixed", accountCode: "662" },

  // Gastos variables
  { name: "Material de oficina", slug: "office-supplies", color: "#06b6d4", entryType: "variable", accountCode: "629" },
  { name: "Marketing y publicidad", slug: "marketing-ads", color: "#f43f5e", entryType: "variable", accountCode: "627" },
  { name: "Software y herramientas", slug: "software-tools", color: "#6366f1", entryType: "variable", accountCode: "629" },
  { name: "Viajes y desplazamientos", slug: "travel-transport", color: "#22c55e", entryType: "variable", accountCode: "629" },
  { name: "Comidas y representación", slug: "meals-entertainment", color: "#eab308", entryType: "variable", accountCode: "629" },
  { name: "Servicios profesionales", slug: "professional-services", color: "#a855f7", entryType: "variable", accountCode: "623" },
  { name: "Equipamiento", slug: "equipment", color: "#0ea5e9", entryType: "variable", accountCode: "629" },
  { name: "Otros", slug: "miscellaneous", color: "#94a3b8", entryType: "variable", accountCode: "629" },
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
          accountCode: category.accountCode,
        },
      })
      console.log(`  Updated: ${category.name} (${category.accountCode})`)
    } else {
      await prisma.category.create({
        data: {
          name: category.name,
          slug: category.slug,
          color: category.color,
          entryType: category.entryType,
          accountCode: category.accountCode,
          isSystem: true,
          organizationId: null,
        },
      })
      console.log(`  Created: ${category.name} (${category.accountCode})`)
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
