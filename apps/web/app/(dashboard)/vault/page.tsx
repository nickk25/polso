import { getTranslations } from "next-intl/server"
import { getVaultItems, getVaultStats } from "@/features/inbox/queries/get-vault"
import { VaultTable } from "@/features/inbox/components/vault-table"
import { CheckCircle, XCircle, Question, Vault } from "@phosphor-icons/react/dist/ssr"

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
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Vault className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t("stats.total")}</p>
          </div>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
            <p className="text-xs text-muted-foreground">{t("stats.matched")}</p>
          </div>
          <p className="text-xl font-bold text-green-500">{stats.matched}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Question className="h-4 w-4 text-amber-500" weight="fill" />
            <p className="text-xs text-muted-foreground">{t("stats.suggested")}</p>
          </div>
          <p className="text-xl font-bold text-amber-500">{stats.suggested}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-500" weight="fill" />
            <p className="text-xs text-muted-foreground">{t("stats.noMatch")}</p>
          </div>
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
