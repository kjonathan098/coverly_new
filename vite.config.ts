import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss(), { ...msw({ mode: 'worker-only' }), apply: 'serve' }],
  server: {
    port: 5173,
    // The backend's CORS and OAuth redirect allow only this origin, so never fall back to another port.
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_API_BASE_URL: 'http://api.test',
    },
  },
})
