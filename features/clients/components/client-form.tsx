"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner, Trash, Sparkle } from "@phosphor-icons/react"
import { toast } from "sonner"
import { CategorySelect } from "@/features/categories/components/category-select"
import { createClientAction, updateClientAction, deleteClientAction } from "../actions/manage-client"
import type { ClientWithStats } from "../queries/get-clients"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface ClientFormProps {
  client?: ClientWithStats | null
  categories: CategoryWithCount[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ClientForm({ client, categories, open, onOpenChange }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [taxId, setTaxId] = useState("")
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)

  const isEditing = !!client

  // Reset form when client changes or sheet opens
  useEffect(() => {
    if (open) {
      if (client) {
        setName(client.name)
        setWebsite(client.website || "")
        setTaxId(client.taxId || "")
        setDefaultCategoryId(client.defaultCategoryId)
      } else {
        setName("")
        setWebsite("")
        setTaxId("")
        setDefaultCategoryId(null)
      }
      setError(null)
    }
  }, [client, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = isEditing
      ? await updateClientAction(client!.id, {
          name,
          website: website || null,
          taxId: taxId || null,
          defaultCategoryId,
        })
      : await createClientAction({
          name,
          website: website || null,
          taxId: taxId || null,
          defaultCategoryId,
        })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    toast.success(isEditing ? "Client updated" : "Client created", {
      description: isEditing
        ? `${name} has been updated.`
        : `${name} has been created.`,
    })

    setLoading(false)
    onOpenChange(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!client) return

    setLoading(true)

    const result = await deleteClientAction(client.id)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      setDeleteDialogOpen(false)
      return
    }

    toast.success("Client deleted", {
      description: `${client.name} has been deleted.`,
    })

    setLoading(false)
    setDeleteDialogOpen(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{isEditing ? "Edit Client" : "New Client"}</SheetTitle>
            <SheetDescription>
              {isEditing ? (
                <span className="flex items-center gap-2">
                  {client.isAutoDetected && (
                    <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                      <Sparkle weight="fill" className="h-3 w-3" />
                      Auto-detected
                    </span>
                  )}
                  {client._count.incomes > 0 && (
                    <span>
                      {client._count.incomes} income{client._count.incomes > 1 ? "s" : ""} •{" "}
                      {formatCurrency(client.totalReceived)}
                    </span>
                  )}
                </span>
              ) : (
                "Create a new client to organize your income."
              )}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-6 p-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corp"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID (optional)</Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g., B12345678"
              />
              <p className="text-xs text-muted-foreground">
                For invoice matching and tax purposes.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Category</Label>
              <CategorySelect
                value={defaultCategoryId}
                onValueChange={setDefaultCategoryId}
                categories={categories}
                placeholder="No default category"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                New income from this client will use this category.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <SheetFooter className="mt-auto p-0 gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={loading}
                  className="mr-auto"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? "Saving..." : "Creating..."}
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Create Client"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              {client && client._count.incomes > 0 ? (
                <>
                  This client has {client._count.incomes} linked income
                  {client._count.incomes > 1 ? "s" : ""}. You must reassign them before
                  deleting, or merge this client with another.
                </>
              ) : (
                <>
                  This will permanently delete <strong>{client?.name}</strong>. This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || (client?._count.incomes ?? 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
