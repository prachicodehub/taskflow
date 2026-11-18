/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the browser calls /api on the Vite server, which forwards to Spring Boot.
    // Same origin for the browser → no CORS issues while developing.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // The browser sees this as same-origin, so drop the Origin header; otherwise Spring's CORS
        // filter would reject any dev port not listed in CORS_ALLOWED_ORIGINS (403 "Invalid CORS request").
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: false,
  },
});
