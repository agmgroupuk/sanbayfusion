import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // Proxy API calls to backend
      '/api': {
        target: 'http://127.0.0.1:3400',
        changeOrigin: true,
      }
    }
  },
  plugins: [react()],
  // SECURITY: No API keys injected into frontend bundle
  // All AI/TTS calls go through backend API routes
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Force ALL react/react-dom imports to the single canonical copy — prevents React #525
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  }
});
