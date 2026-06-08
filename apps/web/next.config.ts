import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

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
    "@polso/banking",
    "@polso/ui",
    "@polso/utils",
    "@polso/plans",
    "@polso/db",
    "@polso/storage",
    "@polso/email",
    "@polso/billing",
    "@polso/intelligence",
    "@polso/matching",
    "@polso/inbox",
    "@polso/accounting",
    "react-markdown",
    "remark-gfm",
  ],
};

export default withNextIntl(nextConfig);
