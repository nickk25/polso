import { authApiHandler } from "@neondatabase/auth/next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

let _handlers: ReturnType<typeof authApiHandler> | null = null

function getHandlers() {
  if (!_handlers) {
    _handlers = authApiHandler()
  }
  return _handlers
}

export function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return getHandlers().GET(req, ctx)
}

export function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return getHandlers().POST(req, ctx)
}
