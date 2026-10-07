import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, makeStats } from '../../test/fixtures'
import { errorResponse, mockApi } from '../../test/mockApi'
import { renderApp } from '../../test/renderApp'

/** Lee el valor de una de las cifras principales a partir de su etiqueta. */
function figure(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return within(term.parentElement!).getAllByRole('definition')[0]
}

describe('estadísticas (HU-06)', () => {
  it('muestra totales y tasas', async () => {
    mockApi({ 'GET /stats': makeStats() })
    renderApp('/stats')

    await screen.findByText('Postulaciones', { selector: 'dt' })
    expect(figure('Postulaciones')).toHaveTextContent('24')
    expect(figure('Tasa de respuesta')).toHaveTextContent('37.5 %')
    expect(figure('Tasa de entrevistas')).toHaveTextContent('25 %')
    expect(figure('Ofertas')).toHaveTextContent('1')
  })

  it('grafica cuántas hay en cada estado', async () => {
    mockApi({ 'GET /stats': makeStats() })
    renderApp('/stats')

    const chart = await screen.findByRole('list', { name: 'Postulaciones por estado' })
    const bars = within(chart).getAllByRole('listitem')
    expect(bars).toHaveLength(4)
    expect(bars[0]).toHaveAccessibleName(/^Postulado: 15 postulaciones, 62.5\s%/)
    expect(bars[2]).toHaveAccessibleName(/^Oferta: 1 postulación,/)
  })

  it('en la gráfica por mes, los meses sin postulaciones aparecen en 0', async () => {
    mockApi({
      'GET /stats': makeStats({
        by_month: [
          { month: '2026-07', count: 2 },
          { month: '2026-09', count: 3 },
        ],
      }),
    })
    renderApp('/stats')

    const chart = await screen.findByRole('list', { name: 'Postulaciones por mes' })
    expect(
      within(chart)
        .getAllByRole('listitem')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual([
      'julio 2026: 2 postulaciones',
      'agosto 2026: 0 postulaciones',
      'septiembre 2026: 3 postulaciones',
    ])
  })

  it('sin postulaciones muestra ceros y no dibuja gráficas', async () => {
    mockApi({ 'GET /stats': EMPTY_STATS })
    renderApp('/stats')

    expect(
      await screen.findByRole('heading', {
        name: 'Las gráficas aparecerán con tu primera postulación',
      }),
    ).toBeInTheDocument()
    expect(figure('Tasa de respuesta')).toHaveTextContent('0 %')
    expect(screen.queryByRole('list', { name: 'Postulaciones por estado' })).not.toBeInTheDocument()
  })

  it('si la API falla, lo explica', async () => {
    mockApi({ 'GET /stats': errorResponse(500, 'internal_error', 'Ocurrió un error inesperado.') })
    renderApp('/stats')

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
