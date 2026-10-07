import { describe, expect, it } from 'vitest'
import { formatDate, formatMonth, formatPercent, pluralize } from './format'

describe('formatDate', () => {
  it('convierte AAAA-MM-DD en DD/MM/AAAA sin moverse de día', () => {
    expect(formatDate('2026-09-28')).toBe('28/09/2026')
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })
})

describe('formatMonth', () => {
  it('usa nombres cortos o largos en español', () => {
    expect(formatMonth('2026-09')).toBe('sep 2026')
    expect(formatMonth('2027-01', 'long')).toBe('enero 2027')
  })
})

describe('formatPercent', () => {
  it('redondea a un decimal y quita el decimal cuando es cero', () => {
    expect(formatPercent(0.375)).toBe('37.5\u00A0%')
    expect(formatPercent(0.3333)).toBe('33.3\u00A0%')
    expect(formatPercent(0.25)).toBe('25\u00A0%')
    expect(formatPercent(0)).toBe('0\u00A0%')
    expect(formatPercent(1)).toBe('100\u00A0%')
  })
})

describe('pluralize', () => {
  it('elige singular o plural según la cantidad', () => {
    expect(pluralize(1, 'postulación', 'postulaciones')).toBe('1 postulación')
    expect(pluralize(0, 'postulación', 'postulaciones')).toBe('0 postulaciones')
    expect(pluralize(3, 'postulación', 'postulaciones')).toBe('3 postulaciones')
  })
})
