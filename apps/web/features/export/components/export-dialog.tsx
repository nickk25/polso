"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { format, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@polso/ui/dialog"
import { Button } from "@polso/ui/button"
import { Calendar } from "@polso/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@polso/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { CalendarBlank, FileZip, Spinner, CheckCircle, DownloadSimple } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { createExportAction, getExportPreviewAction } from "../actions/create-export"

type PeriodType = "quarter" | "month" | "custom"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const t = useTranslations("export")
  const tc = useTranslations("common")
  const currentYear = new Date().getFullYear()
  const [periodType, setPeriodType] = useState<PeriodType>("quarter")
  const [quarter, setQuarter] = useState<string>("Q1")
  const [month, setMonth] = useState<string>("1")
  const [year, setYear] = useState<string>(String(currentYear))
  const [csvSeparator, setCsvSeparator] = useState<";" | ",">(";")
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()

  const [preview, setPreview] = useState<{
    expenseCount: number
    invoiceCount: number
    totalAmount: number
    currency: string
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{
    downloadUrl: string
    fileName: string
    expenseCount: number
    invoiceCount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculate dates based on selection
  // Use noon UTC to avoid timezone boundary issues
  const getDateRange = (): { start: Date; end: Date } | null => {
    const selectedYear = parseInt(year)

    if (periodType === "quarter") {
      const quarterNum = parseInt(quarter.replace("Q", ""))
      const startMonth = (quarterNum - 1) * 3
      const endMonth = startMonth + 2
      // Create dates at noon to avoid timezone issues
      const start = new Date(Date.UTC(selectedYear, startMonth, 1, 12, 0, 0))
      const end = new Date(Date.UTC(selectedYear, endMonth + 1, 0, 12, 0, 0)) // Last day of end month
      return { start, end }
    }

    if (periodType === "month") {
      const monthNum = parseInt(month) - 1
      const start = new Date(Date.UTC(selectedYear, monthNum, 1, 12, 0, 0))
      const end = new Date(Date.UTC(selectedYear, monthNum + 1, 0, 12, 0, 0)) // Last day of month
      return { start, end }
    }

    if (periodType === "custom" && customStartDate && customEndDate) {
      // Normalize custom dates to noon UTC
      const start = new Date(Date.UTC(
        customStartDate.getFullYear(),
        customStartDate.getMonth(),
        customStartDate.getDate(),
        12, 0, 0
      ))
      const end = new Date(Date.UTC(
        customEndDate.getFullYear(),
        customEndDate.getMonth(),
        customEndDate.getDate(),
        12, 0, 0
      ))
      return { start, end }
    }

    return null
  }

  // Fetch preview when dates change
  useEffect(() => {
    const fetchPreview = async () => {
      const range = getDateRange()
      if (!range) {
        setPreview(null)
        return
      }

      setLoadingPreview(true)
      setError(null)

      try {
        const response = await getExportPreviewAction(range.start, range.end)
        if (response.success) {
          setPreview(response.data)
        } else {
          setPreview(null)
          setError(response.error || t("dialog.failedToLoadPreview"))
        }
      } catch (err) {
        setPreview(null)
        setError(err instanceof Error ? err.message : t("dialog.failedToLoadPreview"))
      } finally {
        setLoadingPreview(false)
      }
    }

    fetchPreview()
  }, [periodType, quarter, month, year, customStartDate, customEndDate])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setResult(null)
      setError(null)
    }
  }, [open])

  const handleGenerate = async () => {
    const range = getDateRange()
    if (!range) return

    setGenerating(true)
    setError(null)

    try {
      const response = await createExportAction({
        startDate: range.start,
        endDate: range.end,
        csvSeparator,
      })

      if (response.success) {
        setResult(response.data)
      } else {
        setError(response.error || t("dialog.failedToGenerate"))
      }
    } catch {
      setError(t("dialog.failedToGenerate"))
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (result?.downloadUrl) {
      window.location.href = result.downloadUrl
    }
  }

  const range = getDateRange()
  const canGenerate = range !== null && preview !== null && preview.expenseCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Success state
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" weight="fill" />
            </div>
            <div>
              <p className="font-medium">{t("dialog.exportCompleted")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dialog.expensesAndInvoices", { expenses: result.expenseCount, invoices: result.invoiceCount })}
              </p>
            </div>
            <Button onClick={handleDownload} className="w-full">
              <DownloadSimple className="mr-2 h-4 w-4" />
              {t("dialog.downloadFile", { name: result.fileName })}
            </Button>
          </div>
        ) : (
          // Form state
          <div className="space-y-4">
            {/* Period Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.periodType")}</label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">{t("dialog.quarter")}</SelectItem>
                  <SelectItem value="month">{t("dialog.month")}</SelectItem>
                  <SelectItem value="custom">{t("dialog.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quarter/Month/Custom Selection */}
            {periodType === "quarter" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dialog.quarterLabel")}</label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">{t("dialog.q1")}</SelectItem>
                      <SelectItem value="Q2">{t("dialog.q2")}</SelectItem>
                      <SelectItem value="Q3">{t("dialog.q3")}</SelectItem>
                      <SelectItem value="Q4">{t("dialog.q4")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dialog.year")}</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {periodType === "month" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dialog.monthLabel")}</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dialog.year")}</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {periodType === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dialog.from")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarBlank className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "MMM d, yyyy") : t("dialog.select")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dialog.to")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarBlank className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "MMM d, yyyy") : t("dialog.select")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* CSV Separator */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.separator")}</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={csvSeparator === ";" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCsvSeparator(";")}
                >
                  {t("dialog.separatorSemicolon")}
                </Button>
                <Button
                  type="button"
                  variant={csvSeparator === "," ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCsvSeparator(",")}
                >
                  {t("dialog.separatorComma")}
                </Button>
              </div>
            </div>

            {/* Preview */}
            {range && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  {format(range.start, "MMM d, yyyy")} — {format(range.end, "MMM d, yyyy")}
                </div>

                {loadingPreview ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="h-4 w-4 animate-spin" />
                    {t("dialog.loading")}
                  </div>
                ) : preview ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-semibold">{preview.expenseCount}</div>
                      <div className="text-xs text-muted-foreground">{t("dialog.expensesLabel")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{preview.invoiceCount}</div>
                      <div className="text-xs text-muted-foreground">{t("dialog.invoicesLabel")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">
                        {formatCurrency(preview.totalAmount, preview.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("dialog.totalLabel")}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("dialog.noExpensesInPeriod")}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
            >
              {generating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t("dialog.generating")}
                </>
              ) : (
                <>
                  <FileZip className="mr-2 h-4 w-4" />
                  {t("dialog.generateExport")}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
