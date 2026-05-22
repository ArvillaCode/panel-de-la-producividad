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
  }
})
