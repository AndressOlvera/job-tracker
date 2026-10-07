import { describe, expect, it } from 'vitest'
import { hasActiveFilters, nextSort, parseFilters, toSearchParams } from './filters'

const parse = (query: string) => parseFilters(new URLSearchParams(query))

describe('parseFilters', () => {
  it('sin parámetros usa los valores por defecto', () => {
    expect(parse('')).toEqual({
      status: undefined,
      q: undefined,
      applied_from: undefined,
      applied_to: undefined,
      sort: '-applied_on',
      page: 1,
    })
  })

  it('lee los filtros válidos de la URL', () => {
    expect(
      parse(
        'status=interview&q=%20data%20&applied_from=2026-09-01&applied_to=2026-09-30&sort=company&page=2',
      ),
    ).toEqual({
      status: 'interview',
      q: 'data',
      applied_from: '2026-09-01',
      applied_to: '2026-09-30',
      sort: 'company',
      page: 2,
    })
  })

  it('ignora los valores que no son válidos', () => {
    const filters = parse('status=ghosted&sort=salary&page=-1&applied_from=ayer&q=%20%20')
    expect(filters.status).toBeUndefined()
    expect(filters.sort).toBe('-applied_on')
    expect(filters.page).toBe(1)
    expect(filters.applied_from).toBeUndefined()
    expect(filters.q).toBeUndefined()
  })

  it('si el rango de fechas está al revés, ignora la fecha final', () => {
    const filters = parse('applied_from=2026-09-30&applied_to=2026-09-01')
    expect(filters.applied_from).toBe('2026-09-30')
    expect(filters.applied_to).toBeUndefined()
  })

  it('recorta búsquedas demasiado largas', () => {
    expect(parse(`q=${'a'.repeat(150)}`).q).toHaveLength(100)
  })
})

describe('toSearchParams', () => {
  it('omite los valores por defecto para que la URL quede limpia', () => {
    expect(toSearchParams({ sort: '-applied_on', page: 1 }).toString()).toBe('')
    expect(toSearchParams({ status: 'offer', q: 'qa', sort: 'company', page: 3 }).toString()).toBe(
      'status=offer&q=qa&sort=company&page=3',
    )
  })

  it('es el inverso de parseFilters', () => {
    const query = 'status=rejected&q=oracle&applied_from=2026-08-01&sort=-status&page=2'
    expect(toSearchParams(parse(query)).toString()).toBe(query)
  })
})

describe('hasActiveFilters', () => {
  it('el orden y la página no cuentan como filtros', () => {
    expect(hasActiveFilters(parse('sort=company&page=2'))).toBe(false)
    expect(hasActiveFilters(parse('q=data'))).toBe(true)
  })
})

describe('nextSort', () => {
  it('la primera vez usa la dirección natural de la columna', () => {
    expect(nextSort('-applied_on', 'company')).toBe('company')
    expect(nextSort('company', 'applied_on')).toBe('-applied_on')
  })

  it('al repetir la misma columna invierte la dirección', () => {
    expect(nextSort('company', 'company')).toBe('-company')
    expect(nextSort('-company', 'company')).toBe('company')
  })
})
