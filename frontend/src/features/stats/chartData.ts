// Cálculos para las gráficas, separados de los componentes para probarlos solos.

import type { MonthCount } from '../../api/types'
import { monthRange } from '../../lib/dates'

export const MAX_MONTHS = 12

/**
 * Completa con 0 los meses sin postulaciones (la API solo devuelve meses con
 * datos) y se queda con los últimos 12. Sin esto, la gráfica juntaría meses
 * que no son consecutivos y el tiempo se vería mal.
 */
export function fillMonths(byMonth: MonthCount[]): MonthCount[] {
  if (byMonth.length === 0) return []
  const counts = new Map(byMonth.map((item) => [item.month, item.count]))
  const months = monthRange(byMonth[0].month, byMonth[byMonth.length - 1].month)
  return months.slice(-MAX_MONTHS).map((month) => ({ month, count: counts.get(month) ?? 0 }))
}

/**
 * Escala "redonda" para el eje: con un máximo de 18 da 0, 5, 10, 15, 20.
 * Devuelve el tope del eje y las marcas.
 */
export function niceScale(maxValue: number, targetTicks = 4): { max: number; ticks: number[] } {
  if (maxValue <= 0) return { max: 1, ticks: [0, 1] }
  const rawStep = maxValue / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude
  const niceStep = Math.max(1, step) // Son conteos: el paso mínimo es 1.
  const max = Math.ceil(maxValue / niceStep) * niceStep
  const ticks: number[] = []
  for (let tick = 0; tick <= max; tick += niceStep) ticks.push(tick)
  return { max, ticks }
}
