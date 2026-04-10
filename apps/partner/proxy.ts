import { neonAuthMiddleware } from "@neondatabase/auth/next/server"
import type { NextRequest } from "next/server"

export default function middleware(request: NextRequest) {
  return neonAuthMiddleware({ loginUrl: "/auth/sign-in" })(request)
}

export const config = {
  matcher: [
    "/((?!auth|not-partner|api|_next/static|_next/image|favicon.ico).*)",
  ],
}
