"use client"

import { useTranslations } from "next-intl"
import { Buildings } from "@phosphor-icons/react"
import { Badge } from "@polso/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@polso/ui/card"
import type { PartnerAccess } from "../queries/get-partner-access"

interface PartnerAccessListProps {
  partners: PartnerAccess[]
}

function statusVariant(status: string): "default" | "outline" | "secondary" {
  if (status === "active") return "default"
  if (status === "pending") return "outline"
  return "secondary"
}

export function PartnerAccessList({ partners }: PartnerAccessListProps) {
  const t = useTranslations("settings.partnerAccess")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {partners.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {partners.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Buildings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">{p.partnerName}</p>
                    {p.partnerContactEmail && (
                      <p className="text-xs text-muted-foreground">{p.partnerContactEmail}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {p.connectedAt
                        ? t("connectedOn", { date: new Date(p.connectedAt).toLocaleDateString() })
                        : t("invitedOn", { date: new Date(p.invitedAt).toLocaleDateString() })}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant(p.status)}>{t(`statuses.${p.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
