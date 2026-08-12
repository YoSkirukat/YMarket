import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.yandex.net",
      },
      {
        protocol: "https",
        hostname: "**.market.yandex.ru",
      },
    ],
  },
};

export default nextConfig;
