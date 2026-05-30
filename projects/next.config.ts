import type { NextConfig } from 'next';
import dotenv from 'dotenv';
import path from 'path';

// 本地开发时从 .env 文件加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
