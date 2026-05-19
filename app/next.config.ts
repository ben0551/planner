import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const pbUrl = process.env.PB_INTERNAL_URL ?? "http://localhost:8090";
    return [
      {
        source: "/pb/:path*",
        destination: `${pbUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
