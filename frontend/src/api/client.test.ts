import { describe, expect, it, vi } from 'vitest'
import { errorResponse, jsonResponse } from '../test/mockApi'
import { ApiError, request } from './client'

describe('request', () => {
  it('agrega el prefijo /api/v1 y devuelve el JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/health')).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', expect.anything())
  })

  it('manda Content-Type JSON solo cuando hay cuerpo', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await request('/applications', { method: 'POST', body: '{}' })
    await request('/applications')

    const [withBody, withoutBody] = fetchMock.mock.calls.map(
      ([, init]) => new Headers(init?.headers),
    )
    expect(withBody.get('Content-Type')).toBe('application/json')
    expect(withoutBody.get('Content-Type')).toBeNull()
  })

  it('una respuesta 204 no tiene cuerpo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(null, 204)),
    )

    await expect(request('/applications/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('convierte un error de la API en ApiError con sus detalles', async () => {
    const details = { company: ['Este campo es obligatorio.'] }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        errorResponse(422, 'validation_error', 'Algunos campos no son válidos.', details),
      ),
    )

    const error = await request('/applications').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      message: 'Algunos campos no son válidos.',
      details,
    })
  })

  it('un 5xx sin el formato de la API significa que la API no respondió', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Bad Gateway', { status: 502 })),
    )

    await expect(request('/stats')).rejects.toMatchObject({ status: 502, code: 'api_unavailable' })
  })

  it('otros errores sin formato conocido dan un mensaje general', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Not found', { status: 404 })),
    )

    await expect(request('/stats')).rejects.toMatchObject({ status: 404, code: 'http_error' })
  })

  it('si no hay conexión, avisa que no se pudo conectar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    await expect(request('/stats')).rejects.toMatchObject({ status: 0, code: 'network_error' })
  })

  it('si la petición se canceló, deja pasar el error original', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw abortError
      }),
    )

    await expect(request('/stats', { signal: controller.signal })).rejects.toBe(abortError)
  })
})
