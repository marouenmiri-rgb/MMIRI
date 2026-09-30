/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required to load instrumentation.ts on Next.js 14.
    instrumentationHook: true,
    // Native / binary-path packages used by the cartoon renderer must be
    // required at runtime, not bundled by webpack.
    serverComponentsExternalPackages: ["@resvg/resvg-js", "ffmpeg-static"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

module.exports = nextConfig;
