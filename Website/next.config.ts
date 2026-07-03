import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Image optimization
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85, 100],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.naveenamnaturals.com",
        port: "",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.karthikeyanvenkidusamy.com",
        port: "",
        pathname: "/uploads/**",
      },
    ],
    domains: [
      "localhost",
      "api.naveenamnaturals.com",
      "api.karthikeyanvenkidusamy.com",
    ],
  },

  // Disable source maps in production
  productionBrowserSourceMaps: false,

  // Enable compression
  compress: true,

  // Optimize package imports
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "lucide-react",
      "swiper",
      "framer-motion",
      "react-hot-toast",
      "react-fast-marquee",
    ],
  },

  // Performance optimizations
  poweredByHeader: false,

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    return config;
  },

  // Custom headers to improve performance and bfcache
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate", // Allows bfcache while ensuring freshness
          },
        ],
      },
    ];
  },
};

export default nextConfig;
