import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/storage/r2"
import { randomUUID } from "crypto"
import { processInboxItem } from "@polso/inbox"
import { revalidatePath } from "next/cache"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext()
    const formData = await request.formData()
    const files = formData.getAll("file") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    for (const file of files) {
      if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 })
      }
      if (file.size > UPLOAD_MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 })
      }
    }

    const buffers = await Promise.all(files.map((f) => f.arrayBuffer().then(Buffer.from)))

    const items = await Promise.all(
      files.map(async (file, i) => {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
        const key = `inbox/${organizationId}/${randomUUID()}.${ext}`
        const buffer = buffers[i]!

        await uploadFile(key, buffer, file.type)

        const inboxItem = await prisma.inboxItem.create({
          data: {
            organizationId,
            fileName: file.name,
            filePath: key,
            contentType: file.type,
            size: file.size,
            status: "processing",
            source: "upload",
          },
        })

        return { inboxItem, buffer, contentType: file.type }
      })
    )

    for (const { inboxItem, buffer, contentType } of items) {
      after(async () => {
        await processInboxItem(organizationId, inboxItem.id, buffer, contentType)
        revalidatePath("/vault")
      })
    }

    return NextResponse.json({
      uploaded: items.length,
      files: items.map(({ inboxItem }) => ({ id: inboxItem.id, fileName: inboxItem.fileName })),
    })
  } catch (error) {
    console.error("Error uploading vault documents:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
