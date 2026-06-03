"use client"

import { useState } from "react"
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
import { SpinnerGap } from "@phosphor-icons/react"
import { updateOrganizationAction } from "@/features/settings/actions/update-organization"

const CURRENCIES = [
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "MXN", label: "MXN — Mexican Peso" },
]

interface CreateOrgStepProps {
  initialName: string
  initialCurrency: string
  onComplete: () => void
}

export function CreateOrgStep({ initialName, initialCurrency, onComplete }: CreateOrgStepProps) {
  const t = useTranslations("onboarding.steps.createOrg")
  const [name, setName] = useState(initialName)
  const [currency, setCurrency] = useState(initialCurrency)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await updateOrganizationAction({
      name: name.trim(),
      currency,
      fiscalYearStart: 1,
      dateFormat: "MM/dd/yyyy",
    })
    setLoading(false)
    onComplete()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="org-name">{t("nameLabel")}</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          autoFocus
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">{t("currencyLabel")}</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading || !name.trim()} className="w-full">
        {loading && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
        {t("continue")}
      </Button>
    </form>
  )
}
