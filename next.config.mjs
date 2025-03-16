/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel'de derleme sorunlarını çözmek için ek yapılandırmalar
  output: 'standalone',
  
  // Eski tarayıcılar için transpile işlemini etkinleştir
  transpilePackages: ['bcrypt'],
  
  // Webpack yapılandırması
  webpack: (config, { isServer }) => {
    // Node.js modüllerini client tarafında kullanabilmek için
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;

