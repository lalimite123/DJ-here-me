import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Build sırasında TypeScript hatalarını görmezden gel
    ignoreBuildErrors: true,
  },
  env: {
    // Force l'URL de NextAuth en production pour éviter le bug localhost:3000 sur Railway
    NEXTAUTH_URL: process.env.NODE_ENV === 'production' 
      ? 'https://hear-me-dj-production-8fcb.up.railway.app' 
      : 'http://localhost:3000',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  }
};

export default nextConfig;