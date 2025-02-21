/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',  // Production Firebase Storage
      '127.0.0.1'                        // Local Firebase Storage Emulator
    ]
  }
}

module.exports = nextConfig
