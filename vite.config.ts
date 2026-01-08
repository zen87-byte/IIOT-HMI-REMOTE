import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080, // Port Frontend
    proxy: {
      // Setiap request yang diawali /api akan dibelokkan ke backend port 3000
      '/api': {
        target: 'http://localhost:3000', // Ganti sesuai port backend server Anda
        changeOrigin: true,
        secure: false,
      }
    }
  }
})