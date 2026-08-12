import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sandbox 页面在 iframe 中需要使用 postMessage 与主窗口通信
  // 允许同源访问
  async headers() {
    return [
      {
        source: "/sandbox",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
