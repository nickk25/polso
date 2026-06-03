import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  transpilePackages: [
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
    "react-markdown",
    "remark-gfm",
  ],
};

export default withNextIntl(nextConfig);
