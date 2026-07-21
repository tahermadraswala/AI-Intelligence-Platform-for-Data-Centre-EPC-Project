import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward /api requests to the FastAPI backend during development.
      // In production, configure your reverse proxy (nginx, etc.) instead.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Document ingestion (Spec Checker / RFI Copilot uploads) can be
        // slow on a large file or a cold-starting embedding model —
        // without an explicit timeout here, Node's default can cut the
        // request short and this proxy reports it to the browser as a
        // generic "502 Bad Gateway" with no detail. 120s matches the
        // frontend's own upload timeout (see services/api.js).
        timeout: 120000,
        proxyTimeout: 120000,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            // eslint-disable-next-line no-console
            console.error(
              `[vite proxy] ${req.method} ${req.url} failed: ${err.message} — ` +
              'is the FastAPI backend running on http://localhost:8000?'
            )
          })
        },
      },
    },
  },
})
