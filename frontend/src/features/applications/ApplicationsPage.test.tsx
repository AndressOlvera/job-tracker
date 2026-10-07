import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, makeApplication, makePage, makeStats } from '../../test/fixtures'
import { errorResponse, jsonResponse, mockApi } from '../../test/mockApi'
import { currentLocation, renderApp } from '../../test/renderApp'

const oracle = makeApplication({
  id: 1,
  company: 'Oracle',
  position: 'Becario de Software',
  status: 'interview',
  applied_on: '2026-09-28',
  job_url: 'https://www.occ.com.mx/empleo/oferta/1',
  source: 'OCC',
})
const bosch = makeApplication({
  id: 2,
  company: 'Bosch',
  position: 'Practicante QA',
  status: 'applied',
  applied_on: '2026-09-25',
  job_url: null,
  source: null,
})

function listRequests(requests: { method: string; path: string; query: URLSearchParams }[]) {
  return requests.filter((request) => request.method === 'GET' && request.path === '/applications')
}

describe('lista de postulaciones', () => {
  it('muestra las postulaciones que devuelve la API (HU-02)', async () => {
    mockApi({ 'GET /applications': makePage([oracle, bosch]), 'GET /stats': makeStats() })
    renderApp('/')

    const row = (await screen.findByRole('cell', { name: 'Oracle' })).closest('tr')!
    expect(within(row).getByText('Becario de Software')).toBeInTheDocument()
    expect(within(row).getByText('Entrevista')).toBeInTheDocument()
    expect(within(row).getByText('28/09/2026')).toBeInTheDocument()
    expect(within(row).getByText('OCC')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1–2 de 2')).toBeInTheDocument()
  })

  it('el enlace a la vacante solo aparece si existe (HU-07)', async () => {
    mockApi({ 'GET /applications': makePage([oracle, bosch]), 'GET /stats': makeStats() })
    renderApp('/')

    const link = await screen.findByRole('link', { name: /abrir la vacante de oracle/i })
    expect(link).toHaveAttribute('href', 'https://www.occ.com.mx/empleo/oferta/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(
      screen.queryByRole('link', { name: /abrir la vacante de bosch/i }),
    ).not.toBeInTheDocument()
  })

  it('filtrar por estado actualiza la URL y pide la lista filtrada (HU-03)', async () => {
    const { requests } = mockApi({
      'GET /applications': makePage([oracle]),
      'GET /stats': makeStats(),
    })
    const { user } = renderApp('/')
    await screen.findByRole('cell', { name: 'Oracle' })

    const button = screen.getByRole('button', { name: /^Entrevista/ })
    await user.click(button)

    expect(currentLocation()).toBe('/?status=interview')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => {
      expect(listRequests(requests).at(-1)?.query.get('status')).toBe('interview')
    })
  })

  it('la búsqueda espera a que dejes de escribir (HU-03)', async () => {
    const { requests } = mockApi({
      'GET /applications': makePage([oracle]),
      'GET /stats': makeStats(),
    })
    const { user } = renderApp('/')
    await screen.findByRole('cell', { name: 'Oracle' })

    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'orac')

    await waitFor(() => expect(currentLocation()).toBe('/?q=orac'))
    // Una sola petición con el texto completo, no una por cada letra.
    const searches = () =>
      listRequests(requests)
        .map((request) => request.query.get('q'))
        .filter(Boolean)
    await waitFor(() => expect(searches()).toEqual(['orac']))
  })

  it('ordena por empresa y al repetir invierte el orden', async () => {
    mockApi({ 'GET /applications': makePage([oracle, bosch]), 'GET /stats': makeStats() })
    const { user } = renderApp('/')
    await screen.findByRole('cell', { name: 'Oracle' })

    await user.click(screen.getByRole('button', { name: 'Empresa' }))
    expect(currentLocation()).toBe('/?sort=company')
    expect(screen.getByRole('columnheader', { name: 'Empresa' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await user.click(screen.getByRole('button', { name: 'Empresa' }))
    expect(currentLocation()).toBe('/?sort=-company')
  })

  it('pasa a la página siguiente', async () => {
    mockApi({
      'GET /applications': makePage([oracle, bosch], { total: 45, pages: 3 }),
      'GET /stats': makeStats(),
    })
    const { user } = renderApp('/?status=applied')
    await screen.findByText('Página 1 de 3')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(currentLocation()).toBe('/?status=applied&page=2')
  })

  it('sin postulaciones invita a registrar la primera', async () => {
    mockApi({ 'GET /applications': makePage([]), 'GET /stats': EMPTY_STATS })
    renderApp('/')

    expect(
      await screen.findByRole('heading', { name: 'Aún no registras postulaciones' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrar la primera' })).toHaveAttribute(
      'href',
      '/applications/new',
    )
  })

  it('si los filtros no coinciden, ofrece limpiarlos', async () => {
    mockApi({ 'GET /applications': makePage([]), 'GET /stats': makeStats() })
    const { user } = renderApp('/?q=zzz&sort=company')

    const heading = await screen.findByRole('heading', {
      name: 'Ninguna postulación coincide con los filtros',
    })
    await user.click(
      within(heading.parentElement!).getByRole('button', { name: 'Limpiar filtros' }),
    )

    // Se conserva el orden; se quitan los filtros y se vacía el campo de búsqueda.
    expect(currentLocation()).toBe('/?sort=company')
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('')
  })

  it('si la API falla, explica el error y permite reintentar', async () => {
    let calls = 0
    mockApi({
      'GET /applications': () => {
        calls += 1
        return calls === 1
          ? errorResponse(500, 'internal_error', 'Ocurrió un error inesperado.')
          : makePage([oracle])
      },
      'GET /stats': makeStats(),
    })
    const { user } = renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('cell', { name: 'Oracle' })).toBeInTheDocument()
  })
})

describe('eliminar una postulación (HU-05)', () => {
  it('pide confirmación: cancelar no elimina nada', async () => {
    const { requests } = mockApi({
      'GET /applications': makePage([oracle, bosch]),
      'GET /stats': makeStats(),
    })
    const { user } = renderApp('/')

    await user.click(
      await screen.findByRole('button', { name: 'Eliminar la postulación a Oracle' }),
    )
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar la postulación a Oracle?' })
    expect(dialog).toHaveTextContent('Esta acción no se puede deshacer.')

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requests.some((request) => request.method === 'DELETE')).toBe(false)
  })

  it('al confirmar, elimina, cierra el diálogo y avisa', async () => {
    let deleted = false
    const { requests } = mockApi({
      'GET /applications': () => makePage(deleted ? [bosch] : [oracle, bosch]),
      'GET /stats': makeStats(),
      'DELETE /applications/:id': () => {
        deleted = true
        return jsonResponse(null, 204)
      },
    })
    const { user } = renderApp('/')

    await user.click(
      await screen.findByRole('button', { name: 'Eliminar la postulación a Oracle' }),
    )
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Postulación eliminada')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Oracle' })).not.toBeInTheDocument()
    expect(requests.filter((request) => request.method === 'DELETE')).toEqual([
      expect.objectContaining({ path: '/applications/1' }),
    ])
  })

  it('si falla, muestra el error dentro del diálogo', async () => {
    mockApi({
      'GET /applications': makePage([oracle]),
      'GET /stats': makeStats(),
      'DELETE /applications/:id': errorResponse(
        404,
        'not_found',
        'No existe la postulación con id 1.',
      ),
    })
    const { user } = renderApp('/')

    await user.click(
      await screen.findByRole('button', { name: 'Eliminar la postulación a Oracle' }),
    )
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'No existe la postulación con id 1.',
    )
  })
})
