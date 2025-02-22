/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zirqles.s3.amazonaws.com',
        port: '',
        pathname: '/posts/**',
      },
      {
        protocol: 'https',
        hostname: 'zirqles.s3.amazonaws.com',
        pathname: '/avatars/**',
      },
      // Add Google's domain for profile pictures
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      }
    ],
    domains: [
      // Add any external image domains you're using
      'your-domain.com'
    ]
  },
  // Add headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Add these headers
          {
            key: 'Set-Cookie',
            value: 'Path=/; Secure; SameSite=Lax'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
        ],
      },
    ]
  },
  // Add this configuration
  experimental: {
    missingSuspenseWithCSRError: false,
  },
  // Configure dynamic routes
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
      ],
    }
  }
}

module.exports = nextConfig 