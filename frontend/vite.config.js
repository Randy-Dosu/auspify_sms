import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration
// ------------------
// The important part for this project is `server.proxy`: any request the
// React app makes to a path starting with /api is forwarded to the Flask
// server on port 5000. That means the browser only ever talks to Vite
// (same origin), so we never hit CORS problems during development.
//
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 so the app is reachable from outside
    port: 5173,
    strictPort: true, // fail loudly instead of silently using another port
    allowedHosts: true, // accept requests for the preview/proxy hostname
    proxy: {
      // /api/health -> http://127.0.0.1:5000/api/health
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
