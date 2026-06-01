import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"
import { uploadFile, getSignedDownloadUrl } from "@/lib/storage/r2"
import { randomUUID } from "crypto"

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const userOrg = await getAuthContext()
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!ACCEPTED_TYPES.includes(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large" }, { status: 400 })

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
    const key = `inbox/${userOrg.organizationId}/${randomUUID()}.${ext}`

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, fileBuffer, file.type)

    const inboxItem = await prisma.inboxItem.create({
      data: {
        organizationId: userOrg.organizationId,
        fileName: file.name,
        filePath: key,
        contentType: file.type,
        size: file.size,
        status: "no_match",
        source: "upload",
      },
    })

    const downloadUrl = await getSignedDownloadUrl(key, 3600)

    return NextResponse.json({
      id: inboxItem.id,
      fileName: inboxItem.fileName,
      createdAt: inboxItem.createdAt,
      downloadUrl,
    })
  } catch (error) {
    console.error("Error uploading vault document:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
