import type { NextConfig } from "next";

const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

const nextConfig: NextConfig = isStaticDemo
  ? {
      // GitHub Pages showcase: plain HTML export, no server or database.
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      // Produces .next/standalone with a self-contained server for the Azure
      // App Service zip deploy.
      output: "standalone",
      outputFileTracingIncludes: {
        "/**": ["./src/generated/prisma/**"],
      },
    };

export default nextConfig;
