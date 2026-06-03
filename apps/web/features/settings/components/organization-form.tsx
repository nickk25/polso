"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@polso/ui/card"
import { updateOrganizationAction } from "../actions/update-organization"

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
]

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const DATE_FORMATS = [
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY (01/15/2024)" },
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY (15/01/2024)" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD (2024-01-15)" },
  { value: "dd.MM.yyyy", label: "DD.MM.YYYY (15.01.2024)" },
]

interface OrganizationFormProps {
  organization: {
    id: string
    name: string
    currency: string
    fiscalYearStart: number
    dateFormat: string
  }
}

type Values = {
  name: string
  currency: string
  fiscalYearStart: number
  dateFormat: string
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter()
  const t = useTranslations("settings")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")

  const [values, setValues] = useState<Values>({
    name: organization.name,
    currency: organization.currency,
    fiscalYearStart: organization.fiscalYearStart,
    dateFormat: organization.dateFormat,
  })

  const save = useCallback(async (next: Values) => {
    setStatus("saving")
    const result = await updateOrganizationAction(next)
    if (result.success) router.refresh()
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 1500)
  }, [router])

  const update = useCallback((patch: Partial<Values>, debounceMs = 300) => {
    const next = { ...values, ...patch }
    setValues(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(next), debounceMs)
  }, [values, save])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("organizationForm.title")}</CardTitle>
            <CardDescription>{t("organizationForm.description")}</CardDescription>
          </div>
          <div className="h-4">
            {status === "saving" && <p className="text-xs text-muted-foreground">{t("notificationsForm.saving")}</p>}
            {status === "saved" && <p className="text-xs text-muted-foreground">{t("notificationsForm.saved")}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t("organizationForm.name")}</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => update({ name: e.target.value }, 800)}
            placeholder={t("organizationForm.namePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">{t("organizationForm.currency")}</Label>
          <Select value={values.currency} onValueChange={(v) => update({ currency: v })}>
            <SelectTrigger id="currency">
              <SelectValue placeholder={t("organizationForm.currencyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscalYearStart">{t("organizationForm.fiscalYearStart")}</Label>
          <Select
            value={values.fiscalYearStart.toString()}
            onValueChange={(v) => update({ fiscalYearStart: parseInt(v) })}
          >
            <SelectTrigger id="fiscalYearStart">
              <SelectValue placeholder={t("organizationForm.fiscalYearStartPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {t(`organizationForm.months.${month}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFormat">{t("organizationForm.dateFormat")}</Label>
          <Select value={values.dateFormat} onValueChange={(v) => update({ dateFormat: v })}>
            <SelectTrigger id="dateFormat">
              <SelectValue placeholder={t("organizationForm.dateFormatPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
