import { getExports } from "@/features/export/queries/get-exports"
import { ExportHistory } from "@/features/export/components/export-history"
import { NewExportButton } from "@/features/export/components/new-export-button"

export default async function ExportPage() {
  const exports = await getExports()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end">
        <NewExportButton />
      </div>
      <ExportHistory exports={exports} />
    </div>
  )
}
