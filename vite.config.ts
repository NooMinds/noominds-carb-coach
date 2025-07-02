import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@types': path.resolve(__dirname, './src/types'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  server: {
    // Expose the server to the network, required for Docker and cloud IDEs
    host: true,
    // Default port for the dev server
    port: 5173,
    // Allow requests from deployment platform domains
    allowedHosts: [
      '.csb.app',       // CodeSandbox
      '.vercel.app',    // Vercel
      'localhost',
    ],
    // Optional: open the browser automatically
    open: true,
  },
  build: {
    // Output directory for production build
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: true,
    // Use esbuild for minification to avoid issues with terser
    minify: 'esbuild',
  },
  preview: {
    port: 4173,
    host: true,
  }
});
