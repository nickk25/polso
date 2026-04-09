import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExports } from "@/features/export/queries/get-exports"
import { ExportHistory } from "@/features/export/components/export-history"
import { NewExportButton } from "@/features/export/components/new-export-button"
import { getTranslations } from "next-intl/server"

export default async function ExportPage() {
  const t = await getTranslations("export")
  const exports = await getExports()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <NewExportButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("exportHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExportHistory exports={exports} />
        </CardContent>
      </Card>
    </div>
  )
}
