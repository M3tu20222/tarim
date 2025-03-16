/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel'de derleme sorunlarını çözmek için ek yapılandırmalar
  output: 'standalone',

  // bcrypt modülünü SUNUCU TARAFINDA transpile etmek için. -> Bu satır artık gerekli değil.
  // transpilePackages: ['bcrypt'],

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
        stream: false,
        path: false,
        util: false,
        assert: false,
        http: false,
        https: false,
        zlib: false,
        os: false,
        'mock-aws-s3': false,
        'aws-sdk': false,
        'nock': false,
      };
    }

    // HTML dosyalarını işlemek için
    config.module.rules.push({
      test: /\.html$/,
      use: 'ignore-loader',
    });

    return config;
  },

  // Server Components için harici paketleri belirtelim (GÜNCELLEME)
  serverExternalPackages: ['bcrypt']
  // experimental: {  -> Bu bölüm artık gerekli değil
  //   serverComponentsExternalPackages: ['bcrypt']
  // }
};

export default nextConfig;