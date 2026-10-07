// Los filtros de la lista viven en la URL (/?status=interview&q=data), así se
// conservan al recargar la página o al compartir el enlace. Este módulo traduce
// entre la URL y un objeto de filtros con valores siempre válidos.

import { SORT_FIELDS, type ApplicationFilters, type Sort, type SortField } from '../../api/types'
import { isIsoDate } from '../../lib/dates'
import { isStatus } from '../../lib/status'

export const DEFAULT_SORT: Sort = '-applied_on'
export const MAX_QUERY_LENGTH = 100

/** Dirección con la que empieza cada columna al ordenar por primera vez. */
export const FIRST_SORT: Record<SortField, Sort> = {
  applied_on: '-applied_on',
  created_at: '-created_at',
  company: 'company',
  status: 'status',
}

function isSort(value: unknown): value is Sort {
  return (
    typeof value === 'string' &&
    (SORT_FIELDS as readonly string[]).includes(value.replace(/^-/, ''))
  )
}

function validDate(value: string | null): string | undefined {
  return value && isIsoDate(value) ? value : undefined
}

/** Convierte la URL en filtros. Lo que no sea válido se ignora. */
export function parseFilters(params: URLSearchParams): ApplicationFilters {
  const status = params.get('status')
  const q = params.get('q')?.trim().slice(0, MAX_QUERY_LENGTH)
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  const appliedFrom = validDate(params.get('applied_from'))
  let appliedTo = validDate(params.get('applied_to'))
  // Un rango al revés no tiene resultados: se ignora la fecha final.
  if (appliedFrom && appliedTo && appliedTo < appliedFrom) appliedTo = undefined

  return {
    status: isStatus(status) ? status : undefined,
    q: q || undefined,
    applied_from: appliedFrom,
    applied_to: appliedTo,
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** Convierte filtros en parámetros de URL, omitiendo los valores por defecto. */
export function toSearchParams(filters: ApplicationFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)
  if (filters.applied_from) params.set('applied_from', filters.applied_from)
  if (filters.applied_to) params.set('applied_to', filters.applied_to)
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  return params
}

export function hasActiveFilters(filters: ApplicationFilters): boolean {
  return Boolean(filters.status || filters.q || filters.applied_from || filters.applied_to)
}

/** Siguiente orden al hacer clic en el encabezado de una columna. */
export function nextSort(current: Sort, field: SortField): Sort {
  if (current === field) return `-${field}`
  if (current === `-${field}`) return field
  return FIRST_SORT[field]
}
