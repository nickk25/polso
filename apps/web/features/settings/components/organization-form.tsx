"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
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

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
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
    timezone: string
    fiscalYearStart: number
    dateFormat: string
  }
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(organization.name)
  const [currency, setCurrency] = useState(organization.currency)
  const [timezone, setTimezone] = useState(organization.timezone)
  const [fiscalYearStart, setFiscalYearStart] = useState(organization.fiscalYearStart)
  const [dateFormat, setDateFormat] = useState(organization.dateFormat)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await updateOrganizationAction({
      name,
      currency,
      timezone,
      fiscalYearStart,
      dateFormat,
    })

    setLoading(false)

    if (result.success) {
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t("organizationForm.title")}</CardTitle>
          <CardDescription>
            {t("organizationForm.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("organizationForm.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("organizationForm.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">{t("organizationForm.currency")}</Label>
            <Select value={currency} onValueChange={setCurrency}>
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
            <Label htmlFor="timezone">{t("organizationForm.timezone")}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder={t("organizationForm.timezonePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscalYearStart">{t("organizationForm.fiscalYearStart")}</Label>
            <Select
              value={fiscalYearStart.toString()}
              onValueChange={(v) => setFiscalYearStart(parseInt(v))}
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
            <Select value={dateFormat} onValueChange={setDateFormat}>
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

          <Button type="submit" disabled={loading}>
            {loading ? tc("actions.saving") : tc("actions.saveChanges")}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
