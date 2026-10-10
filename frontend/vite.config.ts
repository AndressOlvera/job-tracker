/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, Vite reenvía todo lo que empieza con /api a Flask. El navegador
// habla con un solo origen, así que no hace falta configurar CORS
// (ver docs/05-decisiones.md, ADR-005). Se usa 127.0.0.1 y no "localhost" porque
// Node puede resolver "localhost" a la dirección IPv6 (::1), donde Flask no escucha.
const apiProxy = {
  '/api': 'http://127.0.0.1:5000',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  test: {
    // jsdom simula el navegador (document, window...) dentro de Node.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Restaura `fetch` y cualquier otro global simulado después de cada prueba.
    unstubGlobals: true,
    // Cobertura: `npm run test:coverage`. La CI la manda a SonarQube Cloud.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      reporter: [
        'text-summary',
        // Rutas relativas a la raíz del repositorio (frontend/src/...), que es
        // como SonarQube Cloud las busca.
        ['lcov', { projectRoot: path.resolve(import.meta.dirname, '..') }],
      ],
    },
  },
})
