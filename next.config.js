/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Bundle analyzer
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      'lucide-react'
    ]
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Compression
  compress: true,

  // Performance optimizations
  // swcMinify is enabled by default in Next.js 15
};

module.exports = nextConfig;