import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // API proxy configuration
  async rewrites() {
    // Priority: Env Var > Hardcoded Render Safety-Net > Localhost
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nuo-backend.onrender.com';
    
    // Ensure protocol
    if (apiUrl && !apiUrl.startsWith('http')) {
      apiUrl = `https://${apiUrl}`;
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
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
