// Configuración de las pruebas de navegador (Playwright).
// Prueban la app completa ya levantada con `docker compose up -d`.
import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests',
  // Las pruebas comparten la base de datos: corren de una en una.
  workers: 1,
  // En la CI falla si alguien dejó un `test.only` olvidado.
  forbidOnly: isCI,
  // En la CI se reintenta dos veces antes de marcar una prueba como fallida.
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    // Docker Compose publica la app en el puerto 8080. Se puede cambiar con BASE_URL.
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
    // Misma zona horaria que la API (APP_TIMEZONE). Si el navegador usara la de
    // la CI (UTC), de noche la fecha por defecto del formulario sería "mañana".
    timezoneId: 'America/Mexico_City',
    locale: 'es-MX',
    // Si una prueba falla, guarda capturas y el "trace" para ver qué pasó.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
