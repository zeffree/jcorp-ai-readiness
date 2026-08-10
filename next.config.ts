import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone with a self-contained server for the Azure
  // App Service zip deploy.
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**"],
  },
};

export default nextConfig;
