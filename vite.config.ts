import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv } from "vite"
import { networkInterfaces } from 'os'

// Get local IP address
const getIpAddress = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), ''); // Load env variables
  const localIp = getIpAddress();

  return {
    plugins: [react(), tailwindcss(), basicSsl()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'process.env.VITE_LOCAL_URL': JSON.stringify(`https://${localIp}:5173`),
      global: 'globalThis',
    },
    server: {
      host: '0.0.0.0', // Listen on all network interfaces
      https: mode === 'development' ? {
        // Use basic SSL in development
      } : false,
      port: 5173,      // Default port
    }
  }
})