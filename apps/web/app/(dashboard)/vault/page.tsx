import { getTranslations } from "next-intl/server"
import { getVaultItems, getVaultStats } from "@/features/inbox/queries/get-vault"
import { VaultTable } from "@/features/inbox/components/vault-table"
import { VaultUploadButton } from "@/features/inbox/components/vault-upload-button"

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1)
  const statusFilter = status ?? "all"

  const [t, { items, total, pages }, stats] = await Promise.all([
    getTranslations("vault"),
    getVaultItems(statusFilter !== "all" ? statusFilter : undefined, page),
    getVaultStats(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <VaultUploadButton />
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("stats.total")}</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("stats.matched")}</p>
          <p className="text-xl font-bold text-green-500">{stats.matched}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("stats.suggested")}</p>
          <p className="text-xl font-bold text-amber-500">{stats.suggested}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("stats.noMatch")}</p>
          <p className="text-xl font-bold text-red-500">{stats.unmatched}</p>
        </div>
      </div>

      <VaultTable
        items={items}
        total={total}
        pages={pages}
        page={page}
        statusFilter={statusFilter}
      />
    </div>
  )
}
