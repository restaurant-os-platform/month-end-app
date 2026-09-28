import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  basePath: "/month-end",
  experimental: { serverActions: { allowedOrigins: ["endvora.com"] } },
  async redirects() {
    return [{
      source: "/:path((?!month-end(?:/|$)).*)",
      destination: "https://endvora.com/month-end/:path",
      basePath: false,
      permanent: false,
    }];
  },
};

export default nextConfig;
