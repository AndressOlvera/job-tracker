import { describe, expect, it } from 'vitest'
import { isIsoDate, monthRange, todayIso } from './dates'

describe('isIsoDate', () => {
  it('acepta fechas reales con formato AAAA-MM-DD', () => {
    expect(isIsoDate('2026-09-28')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)
  })

  it('rechaza otros formatos y fechas imposibles', () => {
    expect(isIsoDate('28/09/2026')).toBe(false)
    expect(isIsoDate('2026-9-28')).toBe(false)
    expect(isIsoDate('2026-02-31')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})

describe('todayIso', () => {
  it('usa la fecha local del navegador, no la de UTC', () => {
    // 11:30 p. m. del 5 de octubre en hora local.
    expect(todayIso(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
  })
})

describe('monthRange', () => {
  it('incluye los meses intermedios y cambia de año', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('con el mismo mes devuelve solo ese mes', () => {
    expect(monthRange('2026-09', '2026-09')).toEqual(['2026-09'])
  })
})
