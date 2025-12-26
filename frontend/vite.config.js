import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Isso habilita 0.0.0.0 (IPv4) e :: (IPv6)
    port: 5173,
    strictPort: true,
  }
})
