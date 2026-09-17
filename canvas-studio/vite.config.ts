import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Served at root of canvas.sanbayfusion.com
    base: '/',
    server: {
      port: 3002,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // SECURITY: Never expose API keys in frontend bundle
    // All AI calls go through backend API at /api/canvas/generate
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Force ALL React imports (including from @monaco-editor/react in
        // parent node_modules) to resolve to the LOCAL React 19 copy.
        // Without this, Monaco picks up frontend/node_modules/react (v18)
        // while the SPA uses canvas-studio/node_modules/react (v19), causing
        // "Cannot read properties of null (reading 'useState')".
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      },
      dedupe: ['react', 'react-dom'],
    }
  };
});
