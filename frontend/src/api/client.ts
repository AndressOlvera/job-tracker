// Función base para hablar con la API. Todas las peticiones pasan por aquí, así
// el manejo de errores es el mismo en toda la aplicación.

export const API_BASE = '/api/v1'

/** Errores de validación por campo: { company: ["Este campo es obligatorio."] } */
export type FieldErrors = Record<string, string[]>

/** Error que devuelve la API con el formato de docs/03-api.md#errores. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: FieldErrors

  constructor(status: number, code: string, message: string, details: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ErrorBody {
  error: { code: string; message: string; details?: FieldErrors }
}

function isErrorBody(body: unknown): body is ErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false
  const error = (body as { error: unknown }).error
  return typeof error === 'object' && error !== null && 'message' in error
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(API_BASE + path, { ...init, headers })
  } catch (error) {
    // Si la petición se canceló a propósito (por ejemplo, al cambiar de filtro
    // antes de que llegara la respuesta), se deja pasar el error tal cual.
    if (init.signal?.aborted) throw error
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con el servidor. Revisa que la API esté encendida.',
    )
  }

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (isErrorBody(body)) {
      const { code, message, details } = body.error
      throw new ApiError(response.status, code, message, details ?? {})
    }
    // Un 5xx sin el formato de la API no viene de Flask, sino de quien está en
    // medio (el proxy de Vite o CloudFront): casi siempre es que la API está apagada.
    if (response.status >= 500) {
      throw new ApiError(
        response.status,
        'api_unavailable',
        'La API no respondió. Revisa que esté encendida e intenta de nuevo.',
      )
    }
    throw new ApiError(
      response.status,
      'http_error',
      `El servidor respondió con un error (${response.status}).`,
    )
  }
  return body as T
}
