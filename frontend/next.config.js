/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow dynamic routes and client-side functionality
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_URL: 'http://localhost:8000',
  },
  async headers() {
    return [
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'text/csv',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
