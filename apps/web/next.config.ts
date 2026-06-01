import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Force all transpiled packages to share the same sonner instance
    // as the web app — prevents duplicate Toaster from the @polso/ui copy.
    config.resolve.alias["sonner"] = path.resolve("node_modules/sonner")
    return config
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
    "react-markdown",
    "remark-gfm",
  ],
};

export default withNextIntl(nextConfig);
