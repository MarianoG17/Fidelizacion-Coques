/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimización de imágenes
  images: {
    formats: ['image/webp', 'image/avif'], // Formatos modernos más livianos
    deviceSizes: [640, 750, 828, 1080, 1200], // Tamaños responsive
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Tamaños de iconos
    minimumCacheTTL: 60 * 60 * 24 * 30, // Cache 30 días
    // Permitir imágenes de WooCommerce externas
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite cualquier dominio HTTPS (para WooCommerce)
      },
      {
        protocol: 'http',
        hostname: 'localhost', // Para desarrollo local
      },
    ],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        // Service worker para PWA
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // Cache agresivo para imágenes estáticas
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
