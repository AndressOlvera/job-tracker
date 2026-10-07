// Una API falsa: reemplaza fetch para que las pruebas no necesiten a Flask.
import { vi } from 'vitest'

export interface ApiRequest {
  method: string
  /** Ruta sin el prefijo /api/v1, por ejemplo "/applications/3" */
  path: string
  query: URLSearchParams
  body: unknown
}

type Handler = (request: ApiRequest) => unknown

export function jsonResponse(body: unknown, status = 200): Response {
  if (status === 204) return new Response(null, { status })
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
): Response {
  return jsonResponse({ error: { code, message, ...(details ? { details } : {}) } }, status)
}

function matches(pattern: string, path: string): boolean {
  const regex = new RegExp(`^${pattern.replace(/:\w+/g, '[^/]+')}$`)
  return regex.test(path)
}

/**
 * Simula la API. Cada ruta se escribe como "GET /applications" o
 * "PATCH /applications/:id" y responde con un objeto (200 JSON), una Response o
 * una función que recibe la petición. Devuelve la lista de peticiones recibidas.
 */
export function mockApi(routes: Record<string, unknown>) {
  const requests: ApiRequest[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init.method ?? 'GET').toUpperCase()
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    const request: ApiRequest = { method, path, query: url.searchParams, body }
    requests.push(request)

    const key = Object.keys(routes).find((route) => {
      const [routeMethod, routePath] = route.split(' ')
      return routeMethod === method && matches(routePath, path)
    })
    if (!key) {
      return errorResponse(500, 'not_mocked', `Petición no simulada: ${method} ${path}`)
    }
    const route = routes[key]
    const reply = typeof route === 'function' ? await (route as Handler)(request) : route
    return reply instanceof Response ? reply : jsonResponse(reply)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { requests, fetchMock }
}
