import { neonAuthMiddleware } from "@neondatabase/auth/next/server"

export default neonAuthMiddleware({
  loginUrl: "/auth/sign-in",
})

export const config = {
  matcher: [
    // Protected routes - exclude auth routes and static files
    "/((?!_next/static|_next/image|favicon.ico|auth|api/auth).*)",
  ],
}
