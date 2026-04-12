import type { NextConfig } from "next";

/**
 * MVP is a fully client-side app. Notes never leave the browser.
 * We ship as a static export so it can be hosted on any static host
 * (Vercel / Cloudflare Pages / GitHub Pages).
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  // transformers.js pulls in node-only packages it doesn't actually need
  // in the browser. Stub them out so webpack can bundle cleanly.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
