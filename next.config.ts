import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.shaggyowl.com',
        pathname: '/app/immagini/**',
      },
    ],
  },
};

export default nextConfig;
