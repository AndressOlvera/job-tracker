// Datos de ejemplo para las pruebas.
import type { Application, Page, Stats } from '../api/types'

export function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
    company: 'Oracle',
    position: 'Becario de Software',
    status: 'applied',
    applied_on: '2026-09-28',
    job_url: null,
    source: 'OCC',
    notes: null,
    created_at: '2026-09-28T17:05:11Z',
    updated_at: '2026-09-28T17:05:11Z',
    ...overrides,
  }
}

export function makePage(
  items: Application[],
  overrides: Partial<Page<Application>> = {},
): Page<Application> {
  return {
    items,
    page: 1,
    per_page: 20,
    total: items.length,
    pages: items.length > 0 ? 1 : 0,
    ...overrides,
  }
}

/** El ejemplo de docs/03-api.md: 24 postulaciones. */
export function makeStats(overrides: Partial<Stats> = {}): Stats {
  return {
    total: 24,
    by_status: { applied: 15, interview: 5, offer: 1, rejected: 3 },
    response_rate: 0.375,
    interview_rate: 0.25,
    by_month: [
      { month: '2026-08', count: 6 },
      { month: '2026-09', count: 18 },
    ],
    ...overrides,
  }
}

export const EMPTY_STATS: Stats = {
  total: 0,
  by_status: { applied: 0, interview: 0, offer: 0, rejected: 0 },
  response_rate: 0,
  interview_rate: 0,
  by_month: [],
}
