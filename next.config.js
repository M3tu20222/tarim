/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle analyzer
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      'lucide-react'
    ]
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    return config;
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