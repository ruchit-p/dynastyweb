/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '*',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Add security headers to protect against common vulnerabilities
  async headers() {
    // Determine if we're in development or production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Define CSP based on environment
    const developmentCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co localhost:* 127.0.0.1:*; connect-src 'self' *.supabase.co localhost:* 127.0.0.1:*; img-src 'self' data: blob: *.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; base-uri 'self';";
    
    // More restrictive CSP for production (no localhost, 127.0.0.1)
    const productionCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co; connect-src 'self' *.supabase.co; img-src 'self' data: blob: *.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; base-uri 'self';";
    
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: isDevelopment ? developmentCSP : productionCSP
          }
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
}

module.exports = nextConfig
