import type { NextConfig } from "next";
import { securityHeaderList } from "./lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaderList(),
      },
    ];
  },
};

export default nextConfig;
