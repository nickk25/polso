import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  transpilePackages: [
    "@polso/cache",
    "@polso/agent",
    "@polso/auth",
    "@polso/intelligence",
    "@polso/billing",
    "@polso/db",
    "@polso/email",
    "@polso/inbox",
    "@polso/accounting",
    "@polso/matching",
    "@polso/plans",
    "@polso/storage",
    "@polso/ui",
    "@polso/utils",
  ],
}

export default nextConfig
