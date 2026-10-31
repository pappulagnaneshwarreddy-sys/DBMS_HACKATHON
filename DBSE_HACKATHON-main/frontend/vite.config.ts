import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Binds to all network interfaces on the host machine
    port: 5173,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  }
});
