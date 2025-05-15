/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add configuration for handling dynamic routes
  experimental: {
    serverComponentsExternalPackages: ["bcrypt"],
  },
  // Ensure proper output for Vercel deployment
  output: "standalone",
}

export default nextConfig;