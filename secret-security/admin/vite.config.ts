import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3451,
        proxy: {
            '/api': { target: 'http://localhost:3450', changeOrigin: true },
        },
    },
    build: {
        outDir: '../backend/admin-dist',
        emptyOutDir: true,
    },
});
