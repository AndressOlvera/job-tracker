import { describe, expect, it } from 'vitest'
import { fillMonths, niceScale } from './chartData'

describe('fillMonths', () => {
  it('rellena con 0 los meses sin postulaciones', () => {
    expect(
      fillMonths([
        { month: '2026-07', count: 2 },
        { month: '2026-09', count: 3 },
      ]),
    ).toEqual([
      { month: '2026-07', count: 2 },
      { month: '2026-08', count: 0 },
      { month: '2026-09', count: 3 },
    ])
  })

  it('se queda con los últimos 12 meses', () => {
    const months = fillMonths([
      { month: '2025-01', count: 1 },
      { month: '2026-06', count: 4 },
    ])
    expect(months).toHaveLength(12)
    expect(months[0].month).toBe('2025-07')
    expect(months[11]).toEqual({ month: '2026-06', count: 4 })
  })

  it('sin datos devuelve una lista vacía', () => {
    expect(fillMonths([])).toEqual([])
  })
})

describe('niceScale', () => {
  it('redondea el tope del eje a un múltiplo cómodo', () => {
    expect(niceScale(18)).toEqual({ max: 20, ticks: [0, 5, 10, 15, 20] })
    expect(niceScale(10)).toEqual({ max: 10, ticks: [0, 5, 10] })
    expect(niceScale(3)).toEqual({ max: 3, ticks: [0, 1, 2, 3] })
  })

  it('nunca usa pasos decimales para conteos', () => {
    expect(niceScale(1).ticks).toEqual([0, 1])
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] })
  })
})
