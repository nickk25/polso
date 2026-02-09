import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"

interface SettingsHeaderProps {
  title: string
  description?: string
}

export async function SettingsHeader({ title, description }: SettingsHeaderProps) {
  const t = await getTranslations("common")

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
        <Link href="/settings">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.backToSettings")}
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
