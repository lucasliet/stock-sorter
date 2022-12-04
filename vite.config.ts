import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/stock-sorter/',
  plugins: [react()],
  server: {
    open: true
  },
  build: { target: 'esnext' }
})
