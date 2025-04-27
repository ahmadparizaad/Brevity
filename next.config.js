/** @type {import('next').NextConfig} */
const nextConfig = {
  // No output: 'export' to allow API routes to function
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
