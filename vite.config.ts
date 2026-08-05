import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // 设置基础路径为相对路径，确保在 GitHub Pages 上正确加载资源
  plugins: [react()],
})
