// postcss.config.mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [
    'tailwindcss',          // Sadece string olarak
    'autoprefixer',         // Sadece string olarak
    '@tailwindcss/postcss', // Sadece string olarak
  ],
};

export default config;