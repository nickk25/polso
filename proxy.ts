import { neonAuthMiddleware } from "@neondatabase/auth/next/server"

export default neonAuthMiddleware({
  loginUrl: "/auth/sign-in",
})

export const config = {
  matcher: [
    // Protected routes - dashboard and app routes only
    "/dashboard/:path*",
    "/expenses/:path*",
    "/income/:path*",
    "/analytics/:path*",
    "/recurring/:path*",
    "/categories/:path*",
    "/vendors/:path*",
    "/clients/:path*",
    "/export/:path*",
    "/settings/:path*",
    "/account/:path*",
  ],
}
