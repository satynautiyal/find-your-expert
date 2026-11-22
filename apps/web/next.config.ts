import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Enforce zero trailing slashes globally (fixes e.g. `/custom-cabinets/california/` -> `/custom-cabinets/california`)
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/contractors/:slug',
        destination: '/companies/:slug',
        permanent: true,
      },
      {
        source: '/contractor/:slug',
        destination: '/companies/:slug',
        permanent: true,
      },
      {
        source: '/company/:slug',
        destination: '/companies/:slug',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'production'
            ? 'https://api.prosvetted.com/api/:path*'
            : 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
