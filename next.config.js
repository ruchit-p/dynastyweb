/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '*',
        pathname: '/**',
      },
    ],
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
