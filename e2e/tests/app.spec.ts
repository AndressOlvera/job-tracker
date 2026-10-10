// Revisiones generales de la app servida por Docker Compose (Nginx + API).
import { expect, test } from '@playwright/test'

test('la API responde en el mismo dominio que la app', async ({ request }) => {
  const response = await request.get('/api/v1/health')
  expect(response.ok()).toBe(true)
  expect(await response.json()).toEqual({ status: 'ok', database: 'ok' })
})

test('cada pantalla carga al abrirla directo, sin errores en la consola', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  // Abrir una ruta directo (o recargarla) solo funciona si Nginx responde
  // index.html en las rutas de la app.
  const screens = [
    { path: '/', heading: 'Postulaciones' },
    { path: '/stats', heading: 'Estadísticas' },
    { path: '/applications/new', heading: 'Nueva postulación' },
    { path: '/una-ruta-que-no-existe', heading: 'Esta página no existe' },
  ]
  for (const { path, heading } of screens) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }

  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Esta página no existe', exact: true }),
  ).toBeVisible()

  expect(errors).toEqual([])
})
