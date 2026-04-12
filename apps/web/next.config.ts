import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@polso/agent",
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
  ],
};

export default withNextIntl(nextConfig);
