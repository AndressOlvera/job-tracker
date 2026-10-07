// Una función por endpoint de la API (ver docs/03-api.md).

import { request } from './client'
import type { Application, ApplicationFilters, ApplicationInput, Page, Stats } from './types'

export function toApiParams(filters: ApplicationFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)
  if (filters.applied_from) params.set('applied_from', filters.applied_from)
  if (filters.applied_to) params.set('applied_to', filters.applied_to)
  params.set('sort', filters.sort)
  params.set('page', String(filters.page))
  return params
}

export function listApplications(filters: ApplicationFilters, signal?: AbortSignal) {
  return request<Page<Application>>(`/applications?${toApiParams(filters)}`, { signal })
}

export function getApplication(id: number, signal?: AbortSignal) {
  return request<Application>(`/applications/${id}`, { signal })
}

export function createApplication(input: ApplicationInput) {
  return request<Application>('/applications', { method: 'POST', body: JSON.stringify(input) })
}

export function updateApplication(id: number, input: ApplicationInput) {
  return request<Application>(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteApplication(id: number) {
  return request<void>(`/applications/${id}`, { method: 'DELETE' })
}

export function getStats(signal?: AbortSignal) {
  return request<Stats>('/stats', { signal })
}
