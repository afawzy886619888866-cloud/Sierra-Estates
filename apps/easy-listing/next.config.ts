import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/vercel-react-view-transitions",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
