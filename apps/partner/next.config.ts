import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@polso/agent",
    "@polso/auth",
    "@polso/intelligence",
    "@polso/billing",
    "@polso/db",
    "@polso/email",
    "@polso/inbox",
    "@polso/matching",
    "@polso/plans",
    "@polso/storage",
    "@polso/ui",
    "@polso/utils",
  ],
}

export default nextConfig
