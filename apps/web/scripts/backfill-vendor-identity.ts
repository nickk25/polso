/**
 * One-time backfill: re-key every Counterparty with the canonical `canonicalize()`
 * identity, collapse fragments, suppress generics, and re-denormalize transactions.
 *
 * SAFE BY DEFAULT — dry-run unless `--apply` is passed. The dry-run is read-only
 * and writes a reversible JSON report. `--apply` requires the schema migration
 * (Counterparty.iban/seenLocations/mergedFrom, Transaction.counterpartyIban) to be
 * live in the database first.
 *
 *   Dry run (read-only):   DATABASE_URL=… npx tsx scripts/backfill-vendor-identity.ts
 *   Single org:            … scripts/backfill-vendor-identity.ts --org=<id>
 *   Apply (writes!):       … scripts/backfill-vendor-identity.ts --apply
 *
 * Idempotent: a second run finds no collisions and performs no renames.
 */
import { writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { prisma } from "@polso/db"
import { canonicalize } from "@polso/banking"
import { mergeCounterpartiesCore } from "@/features/counterparties/lib/merge-counterparties-core"

const APPLY = process.argv.includes("--apply")
const orgArg = process.argv.find((a) => a.startsWith("--org="))?.split("=")[1]

const seedPatterns = (matchKey: string): string[] =>
  matchKey.startsWith("gov:") ? [] : matchKey.split(" ").filter(Boolean)

interface CpRow {
  id: string
  name: string
  normalizedName: string
  entries: number
}

interface GroupPlan {
  matchKey: string
  displayName: string
  seenLocations: string[]
  survivorId: string
  sourceIds: string[]
  mergedFrom: { id: string; name: string; normalizedName: string }[]
  totalEntries: number
}

interface OrgPlan {
  organizationId: string
  totalCounterparties: number
  collisions: GroupPlan[]
  renames: GroupPlan[] // size-1 groups that still change key/name
  generics: { id: string; name: string; entries: number }[]
}

async function planOrg(organizationId: string): Promise<OrgPlan> {
  const raw = await prisma.counterparty.findMany({
    where: { organizationId },
    select: { id: true, name: true, normalizedName: true, _count: { select: { entries: true } } },
  })
  const cps: CpRow[] = raw.map((c) => ({
    id: c.id,
    name: c.name,
    normalizedName: c.normalizedName,
    entries: c._count.entries,
  }))

  const byKey = new Map<string, { cp: CpRow; displayName: string; seenLocations: string[] }[]>()
  const generics: OrgPlan["generics"] = []

  for (const cp of cps) {
    const { matchKey, displayName, seenLocations } = canonicalize(cp.name)
    if (!matchKey) {
      generics.push({ id: cp.id, name: cp.name, entries: cp.entries })
      continue
    }
    const bucket = byKey.get(matchKey) ?? []
    bucket.push({ cp, displayName, seenLocations })
    byKey.set(matchKey, bucket)
  }

  const collisions: GroupPlan[] = []
  const renames: GroupPlan[] = []

  for (const [matchKey, members] of byKey) {
    // Survivor = most entries (most-established row).
    const sorted = [...members].sort((a, b) => b.cp.entries - a.cp.entries)
    const survivor = sorted[0]
    const sources = sorted.slice(1)
    // Merge unions seenLocations across members.
    const seenLocations = [...new Set(members.flatMap((m) => m.seenLocations))]

    const plan: GroupPlan = {
      matchKey,
      displayName: survivor.displayName || survivor.cp.name,
      seenLocations,
      survivorId: survivor.cp.id,
      sourceIds: sources.map((s) => s.cp.id),
      mergedFrom: sources.map((s) => ({ id: s.cp.id, name: s.cp.name, normalizedName: s.cp.normalizedName })),
      totalEntries: members.reduce((sum, m) => sum + m.cp.entries, 0),
    }

    if (sources.length > 0) collisions.push(plan)
    else if (survivor.cp.normalizedName !== matchKey || survivor.cp.name !== plan.displayName) renames.push(plan)
  }

  return { organizationId, totalCounterparties: cps.length, collisions, renames, generics }
}

async function applyOrg(plan: OrgPlan) {
  // 1) Collapse collision groups, then rename + reseed survivors.
  for (const g of [...plan.collisions, ...plan.renames]) {
    if (g.sourceIds.length > 0) {
      await prisma.$transaction((tx) =>
        mergeCounterpartiesCore(tx, {
          organizationId: plan.organizationId,
          sourceIds: g.sourceIds,
          targetId: g.survivorId,
        })
      )
    }
    await prisma.counterparty.update({
      where: { id: g.survivorId },
      data: {
        normalizedName: g.matchKey,
        name: g.displayName,
        seenLocations: g.seenLocations,
        detectionPatterns: seedPatterns(g.matchKey),
        mergedFrom: g.mergedFrom.length ? g.mergedFrom : undefined,
      },
    })
    // Re-denormalize the survivor's transactions to the clean key.
    const entries = await prisma.entry.findMany({
      where: { counterpartyId: g.survivorId },
      select: { transactionId: true },
    })
    const txIds = [...new Set(entries.map((e) => e.transactionId).filter(Boolean))] as string[]
    if (txIds.length) {
      await prisma.transaction.updateMany({
        where: { id: { in: txIds } },
        data: { counterpartyName: g.matchKey },
      })
    }
  }

  // 2) Generics: detach links, then delete the junk row.
  for (const gen of plan.generics) {
    await prisma.$transaction(async (tx) => {
      await tx.entry.updateMany({ where: { counterpartyId: gen.id }, data: { counterpartyId: null } })
      await tx.recurringPattern.updateMany({ where: { counterpartyId: gen.id }, data: { counterpartyId: null } })
      await tx.dismissedPattern.updateMany({ where: { counterpartyId: gen.id }, data: { counterpartyId: null } })
      await tx.counterparty.delete({ where: { id: gen.id } })
    })
  }
}

async function main() {
  const orgIds = orgArg
    ? [orgArg]
    : (await prisma.organization.findMany({ select: { id: true } })).map((o) => o.id)

  const plans: OrgPlan[] = []
  for (const orgId of orgIds) plans.push(await planOrg(orgId))

  const totals = plans.reduce(
    (acc, p) => ({
      cps: acc.cps + p.totalCounterparties,
      collisions: acc.collisions + p.collisions.length,
      collapsing: acc.collapsing + p.collisions.reduce((s, g) => s + g.sourceIds.length, 0),
      renames: acc.renames + p.renames.length,
      generics: acc.generics + p.generics.length,
    }),
    { cps: 0, collisions: 0, collapsing: 0, renames: 0, generics: 0 }
  )

  console.log(`\n=== VENDOR IDENTITY BACKFILL (${APPLY ? "APPLY" : "DRY RUN"}) ===`)
  console.log(`Orgs:                 ${plans.length}`)
  console.log(`Counterparties:       ${totals.cps}`)
  console.log(`Collision groups:     ${totals.collisions} (collapsing ${totals.collapsing} source rows)`)
  console.log(`Key/name-only renames:${totals.renames}`)
  console.log(`Generic rows removed: ${totals.generics}`)
  console.log(
    `Resulting vendors:    ${totals.cps - totals.collapsing - totals.generics}`
  )

  const reportPath = join(tmpdir(), `vendor-backfill-report.json`)
  writeFileSync(reportPath, JSON.stringify(plans, null, 2))
  console.log(`\nReversible report (mergedFrom map) written to:\n  ${reportPath}`)

  if (!APPLY) {
    console.log(`\nDry run only — no writes. Re-run with --apply (after the schema migration) to execute.`)
    await prisma.$disconnect()
    return
  }

  console.log(`\nAPPLYING …`)
  for (const plan of plans) {
    await applyOrg(plan)
    console.log(`  ✓ org ${plan.organizationId}: ${plan.collisions.length} merged, ${plan.generics.length} removed`)
  }
  console.log(`\nDone. Re-run without --apply to confirm idempotency (expect 0 collisions).`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
