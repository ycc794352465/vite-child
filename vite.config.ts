import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const useDevMode = true

// https://vitejs.dev/config/
export default defineConfig({
  base: '/vite-child/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server:{
    host: '0.0.0.0', // 允许局域网访问
    port: 8080,
    proxy: {
      '/bigmodel-api': {
        target: 'https://open.bigmodel.cn/api/paas/v4',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/bigmodel-api/, '')
      },
      '/api/search': {
        target: 'https://www.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '/s'),
         headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }
    }
  },
  plugins: [
    vue()
  ]
})
