/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yes-luxe.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // 🛑 FIX: Remove the unrecognized 'allowedDevOrigins' key
  experimental: {
    // This block is now clean.
  },

  // ✅ CRITICAL FIX: Keep the webpack config for Firebase Admin SDK isolation
  webpack: (config, { isServer }) => {
    if (isServer) {
      // This is the essential fix for the Firebase/Next.js module conflict.
      config.externals.push('firebase-admin');
    }
    return config;
  },
};

module.exports = nextConfig;