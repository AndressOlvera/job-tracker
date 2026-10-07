// Hooks de TanStack Query: piden los datos a la API, los guardan en caché y
// exponen su estado (cargando, error, datos) a los componentes.

import {
  QueryClient,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createApplication,
  deleteApplication,
  getApplication,
  getStats,
  listApplications,
  updateApplication,
} from './applications'
import { ApiError } from './client'
import type { ApplicationFilters, ApplicationInput } from './types'

// Llaves de la caché. Todo lo de postulaciones empieza con "applications", así
// se puede invalidar de una sola vez después de crear, editar o eliminar.
export const queryKeys = {
  applications: ['applications'] as const,
  list: (filters: ApplicationFilters) => ['applications', 'list', filters] as const,
  detail: (id: number) => ['applications', 'detail', id] as const,
  stats: ['stats'] as const,
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Un error 4xx (por ejemplo, 404) no se arregla reintentando.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
          return failureCount < 2
        },
      },
    },
  })
}

export function useApplications(filters: ApplicationFilters) {
  return useQuery({
    queryKey: queryKeys.list(filters),
    queryFn: ({ signal }) => listApplications(filters, signal),
    // Mientras llega la página nueva se sigue mostrando la anterior: sin parpadeos.
    placeholderData: keepPreviousData,
  })
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: ({ signal }) => getApplication(id, signal),
  })
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => getStats(signal),
  })
}

/** Después de cualquier cambio, la lista y las estadísticas se vuelven a pedir. */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
    ])
}

export function useCreateApplication() {
  const invalidateAll = useInvalidateAll()
  return useMutation({
    mutationFn: (input: ApplicationInput) => createApplication(input),
    onSuccess: invalidateAll,
  })
}

export function useUpdateApplication(id: number) {
  const invalidateAll = useInvalidateAll()
  return useMutation({
    mutationFn: (input: ApplicationInput) => updateApplication(id, input),
    onSuccess: invalidateAll,
  })
}

export function useDeleteApplication() {
  const invalidateAll = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: invalidateAll,
  })
}
