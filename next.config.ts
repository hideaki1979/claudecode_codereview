import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components機能を有効化
  // 'use cache' ディレクティブ、cacheTag、cacheLife を使用するために必要
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
  cacheComponents: true,
};

export default nextConfig;
