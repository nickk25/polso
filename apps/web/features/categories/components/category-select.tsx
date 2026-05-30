"use client"

import { useTranslations } from "next-intl"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { NONE_VALUE } from "../lib/constants"
import type { CategoryWithCount } from "../queries/get-categories"

interface CategorySelectProps {
  value?: string | null
  onValueChange: (value: string | null) => void
  categories: CategoryWithCount[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CategorySelect({
  value,
  onValueChange,
  categories,
  placeholder = "Select category",
  disabled = false,
  className,
}: CategorySelectProps) {
  const t = useTranslations("categories")
  const systemCategories = categories.filter((c) => c.isSystem)
  const customCategories = categories.filter((c) => !c.isSystem)
  const selected = categories.find((c) => c.id === value)

  return (
    <Select
      value={value || NONE_VALUE}
      onValueChange={(val) => onValueChange(val === NONE_VALUE ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selected && (
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
              {selected.name}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>
          <span className="text-muted-foreground">{t("select.noCategory")}</span>
        </SelectItem>

        {customCategories.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{t("select.customCategories")}</SelectLabel>
              {customCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        {systemCategories.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{t("select.systemCategories")}</SelectLabel>
              {systemCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  )
}
