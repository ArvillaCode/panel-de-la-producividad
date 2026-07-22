import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = ['app.upfunnel.click', 'upfunnel.click', 'www.upfunnel.click']

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.jsx', '.js', '.ts', '.tsx', '.json']
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts
  },
  preview: {
    allowedHosts
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-dom') || id.includes('react-router') || /node_modules[\\/]react[\\/]/.test(id)) {
            return 'react-vendor'
          }
          return undefined
        }
      }
    }
  }
})
