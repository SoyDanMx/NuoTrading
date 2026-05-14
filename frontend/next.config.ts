import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // API proxy configuration
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: apiUrl.startsWith('http') 
          ? `${apiUrl}/api/:path*`
          : `http://localhost:8000/api/:path*`,
      },
    ];
  },

  // Image optimization (Next.js 14+)
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    ],
  },
};

export default nextConfig;
