"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "@polso/ui/sonner"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@polso/ui/avatar"
import { Separator } from "@polso/ui/separator"
import { Camera } from "@phosphor-icons/react"
import { authClient } from "@polso/auth/client"
import { uploadProfileImageAction } from "../actions/upload-profile-image"

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = name || email?.split("@")[0] || "U"
  const words = source.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

interface ProfileSectionProps {
  userId: string
  userName: string | null
  userEmail: string | null
  userImage: string | null
}

export function ProfileSection({ userId, userName, userEmail, userImage }: ProfileSectionProps) {
  const router = useRouter()
  const t = useTranslations("profile")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialName = userName || userEmail?.split("@")[0] || ""
  const [name, setName] = useState(initialName)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [avatarUrl, setAvatarUrl] = useState(userImage)

  const [isUploadPending, startUploadTransition] = useTransition()
  const [isNamePending, startNameTransition] = useTransition()
  const [isPasswordPending, startPasswordTransition] = useTransition()

  const initials = getInitials(userName, userEmail)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("fileTooLarge"))
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]
      startUploadTransition(async () => {
        try {
          const res = await uploadProfileImageAction({
            fileData: base64,
            contentType: file.type,
            fileSize: file.size,
          })
          if (!res.success) {
            toast.error(res.error ?? t("uploadError"))
            return
          }
          const url = res.data.url
          const updateRes = await authClient.updateUser({ image: url })
          if (updateRes.error) {
            toast.error(t("uploadError"))
            return
          }
          setAvatarUrl(`${url}?t=${Date.now()}`)
          toast.success(t("photoUpdated"))
          router.refresh()
        } catch {
          toast.error(t("uploadError"))
        }
      })
    }
    reader.readAsDataURL(file)
  }

  function handleSaveName() {
    if (!name.trim()) return
    startNameTransition(async () => {
      try {
        const res = await authClient.updateUser({ name: name.trim() })
        if (res.error) {
          toast.error(t("nameError"))
        } else {
          toast.success(t("nameSaved"))
          router.refresh()
        }
      } catch {
        toast.error(t("nameError"))
      }
    })
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t("passwordTooShort"))
      return
    }
    if (newPassword === currentPassword) {
      toast.error(t("passwordSameAsCurrent"))
      return
    }
    startPasswordTransition(async () => {
      try {
        const res = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        })
        if (res.error) {
          const msg = res.error.message ?? ""
          if (msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("invalid")) {
            toast.error(t("passwordIncorrect"))
          } else {
            toast.error(t("passwordError"))
          }
        } else {
          toast.success(t("passwordUpdated"))
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
        }
      } catch {
        toast.error(t("passwordError"))
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl ?? undefined} alt={name || userEmail || "User"} />
            <AvatarFallback delayMs={0} className="text-base font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadPending}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            aria-label={t("changePhoto")}
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{name || userEmail?.split("@")[0]}</p>
          <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 disabled:opacity-50"
          >
            {isUploadPending ? t("uploading") : t("changePhoto")}
          </button>
        </div>
      </div>

      <Separator />

      {/* Name */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="display-name">{t("nameLabel")}</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
          />
        </div>
        <Button onClick={handleSaveName} disabled={isNamePending || !name.trim() || name.trim() === initialName}>
          {isNamePending ? t("saving") : t("saveName")}
        </Button>
      </div>

      <Separator />

      {/* Password */}
      <div className="space-y-3">
        <p className="text-sm font-medium">{t("changePassword")}</p>
        <div className="space-y-2">
          <Label htmlFor="current-password">{t("currentPassword")}</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">{t("newPassword")}</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={isPasswordPending || !currentPassword || !newPassword || !confirmPassword}
          variant="outline"
        >
          {isPasswordPending ? t("saving") : t("updatePassword")}
        </Button>
      </div>
    </div>
  )
}
