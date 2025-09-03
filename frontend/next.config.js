/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow dynamic routes and client-side functionality
  trailingSlash: true,
  images: {
    unoptimized: true,
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
