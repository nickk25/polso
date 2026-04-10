import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@polso/auth",
    "@polso/billing",
    "@polso/db",
    "@polso/email",
    "@polso/matching",
    "@polso/plans",
    "@polso/storage",
    "@polso/ui",
    "@polso/utils",
  ],
}

export default nextConfig
