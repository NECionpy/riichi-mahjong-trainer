import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./", // 设置基础路径为相对路径，确保在 GitHub Pages 上正确加载资源
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // 自动更新 Service Worker
      includeAssets: ["favicon.ico", "icons/icon-180x180.png"],
      manifest: {
        name: "立直麻将训练器",
        short_name: "麻将训练器",
        description:
          "立直麻将训练器是一个专注于立直麻将的在线训练工具。它提供了丰富的功能，帮助玩家提高立直麻将技巧，包括牌型分析、听牌计算、点数计算、待摸牌训练等。",
        theme_color: "#000000",
        icons: [
          {
            src: "icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "icons/icon-180x180.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
  },
});
