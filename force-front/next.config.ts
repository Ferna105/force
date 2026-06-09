import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // el navegador carga las imágenes directo de Strapi (evita el fetch server-side del optimizador, que en Docker no resuelve localhost:1337)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        // Strapi en producción (Railway sirve por HTTPS en un dominio dinámico)
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
