import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from "vite-plugin-qiankun";

const useDevMode = true

// https://vitejs.dev/config/
export default defineConfig({
  server:{
    port: 10001,
    origin: 'http://localhost:10001'
  },
  plugins: [vue(),
    qiankun('vite-plugin-qiankun', {
      useDevMode
    })]
})
