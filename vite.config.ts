import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from "vite"
 
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    https: true,     // Enable HTTPS with basic SSL plugin
    port: 5173,      // Default port
  }
})