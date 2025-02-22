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
        ],
      },
    ]
  }
}

module.exports = nextConfig 