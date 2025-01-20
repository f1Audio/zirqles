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
    ],
  },
}

module.exports = nextConfig 