// Flujo completo de una postulación, como lo haría una persona en el navegador.
import { expect, test, type APIRequestContext } from '@playwright/test'

// Un nombre distinto en cada corrida, para no chocar con datos que ya existan.
let company: string

test.beforeEach(() => {
  company = `Empresa E2E ${Date.now()}`
})

// Si la prueba falla a la mitad, borra lo que haya creado para no dejar basura.
test.afterEach(async ({ request }) => {
  await deleteApplications(request, company)
})

async function deleteApplications(request: APIRequestContext, query: string) {
  const response = await request.get('/api/v1/applications', { params: { q: query } })
  const { items } = (await response.json()) as { items: { id: number }[] }
  for (const item of items) {
    await request.delete(`/api/v1/applications/${item.id}`)
  }
}

test('crear, buscar, editar, filtrar y eliminar una postulación', async ({ page }) => {
  await page.goto('/')

  // Crear
  await page.getByRole('link', { name: 'Nueva postulación' }).click()
  await page.getByLabel(/^Empresa/).fill(company)
  await page.getByLabel(/^Puesto/).fill('Becario de QA')
  await page.getByLabel('Fuente').fill('OCC')
  await page.getByRole('button', { name: 'Guardar postulación' }).click()
  await expect(page.getByText('Postulación guardada')).toBeVisible()

  // Buscar: la lista se filtra al dejar de escribir y el filtro queda en la URL
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(company)
  await expect(page).toHaveURL(/[?&]q=/)
  const row = page.getByRole('row').filter({ hasText: company })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Postulado')

  // Editar: al guardar regresa a la lista con la búsqueda que tenía
  await page.getByRole('link', { name: `Editar la postulación a ${company}` }).click()
  await expect(page.getByLabel(/^Empresa/)).toHaveValue(company)
  await page.getByLabel('Estado').selectOption('interview')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await expect(row).toContainText('Entrevista')

  // Filtrar por estado
  await page.getByRole('button', { name: /^Rechazado/ }).click()
  await expect(page).toHaveURL(/status=rejected/)
  await expect(row).toHaveCount(0)
  await page.getByRole('button', { name: /^Entrevista/ }).click()
  await expect(page).toHaveURL(/status=interview/)
  await expect(row).toHaveCount(1)

  // Eliminar, con confirmación
  await page.getByRole('button', { name: `Eliminar la postulación a ${company}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Postulación eliminada')).toBeVisible()
  await expect(row).toHaveCount(0)
})

test('el formulario no deja guardar sin los campos obligatorios', async ({ page }) => {
  await page.goto('/applications/new')
  await page.getByRole('button', { name: 'Guardar postulación' }).click()
  await expect(page.getByText('Este campo es obligatorio.')).toHaveCount(2)
  await expect(page).toHaveURL(/\/applications\/new$/)
})
