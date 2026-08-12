import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    proxy: {
      '/epicor': {
        target: 'https://supermax-pilot.epicorsaas.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/epicor/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          if (id.includes('@tanstack/')) return 'vendor-query'
          if (id.includes('@supabase/')) return 'vendor-supabase'
          if (id.includes('lucide-react') || id.includes('qrcode') || id.includes('jsbarcode')) return 'vendor-utils'
        },
      },
    },
  },
})
