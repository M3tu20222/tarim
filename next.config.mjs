/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // External packages configuration (updated from experimental.serverComponentsExternalPackages)
  serverExternalPackages: ["bcrypt"],
  // Ensure proper output for Vercel deployment
  output: "standalone",
}

export default nextConfig;