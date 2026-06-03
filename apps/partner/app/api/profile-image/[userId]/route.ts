import { NextRequest, NextResponse } from "next/server"
import { getFile } from "@polso/storage"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  try {
    const { body, contentType } = await getFile(`profile-images/${userId}`)
    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": contentType ?? "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
