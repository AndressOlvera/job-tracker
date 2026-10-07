// Tipos que describen lo que envía y recibe la API (ver docs/03-api.md).

export const STATUSES = ['applied', 'interview', 'offer', 'rejected'] as const
export type Status = (typeof STATUSES)[number]

export interface Application {
  id: number
  company: string
  position: string
  status: Status
  /** Fecha con formato AAAA-MM-DD */
  applied_on: string
  job_url: string | null
  source: string | null
  notes: string | null
  /** Fecha y hora en UTC (ISO 8601) */
  created_at: string
  updated_at: string
}

/** Lo que el frontend envía al crear o editar una postulación. */
export interface ApplicationInput {
  company: string
  position: string
  status: Status
  applied_on: string
  job_url: string | null
  source: string | null
  notes: string | null
}

export interface Page<T> {
  items: T[]
  page: number
  per_page: number
  total: number
  pages: number
}

export const SORT_FIELDS = ['applied_on', 'company', 'status', 'created_at'] as const
export type SortField = (typeof SORT_FIELDS)[number]
/** Un "-" al inicio indica orden descendente, por ejemplo "-applied_on". */
export type Sort = SortField | `-${SortField}`

export interface ApplicationFilters {
  status?: Status
  q?: string
  applied_from?: string
  applied_to?: string
  sort: Sort
  page: number
}

export interface MonthCount {
  /** Mes con formato AAAA-MM */
  month: string
  count: number
}

export interface Stats {
  total: number
  by_status: Record<Status, number>
  response_rate: number
  interview_rate: number
  by_month: MonthCount[]
}
