import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/lobby/baked/:path*', headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ] }, ...(process.env.NODE_ENV === 'production' ? [{
      source: '/lobby/:path*',
      has: [{ type: 'query' as const, key: 'v', value: '[a-f0-9]{16}' }],
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }] : [])];
  },
};

export default withBundleAnalyzer(nextConfig);
