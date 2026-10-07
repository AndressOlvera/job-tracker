import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayIso } from '../../lib/dates'
import { makeApplication, makePage, makeStats } from '../../test/fixtures'
import { errorResponse, mockApi } from '../../test/mockApi'
import { currentLocation, renderApp } from '../../test/renderApp'

const listRoutes = { 'GET /applications': makePage([]), 'GET /stats': makeStats() }

describe('nueva postulación (HU-01)', () => {
  it('marca los campos obligatorios, enfoca el primero y no envía nada', async () => {
    const { requests } = mockApi(listRoutes)
    const { user } = renderApp('/applications/new')

    await user.click(screen.getByRole('button', { name: 'Guardar postulación' }))

    expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(2)
    const company = screen.getByLabelText(/^Empresa/)
    expect(company).toHaveAttribute('aria-invalid', 'true')
    expect(company).toHaveAccessibleDescription('Este campo es obligatorio.')
    expect(company).toHaveFocus()
    expect(requests.some((request) => request.method === 'POST')).toBe(false)
  })

  it('el error de un campo desaparece al corregirlo', async () => {
    mockApi(listRoutes)
    const { user } = renderApp('/applications/new')

    await user.click(screen.getByRole('button', { name: 'Guardar postulación' }))
    await user.type(screen.getByLabelText(/^Empresa/), 'Oracle')

    expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(1)
    expect(screen.getByLabelText(/^Empresa/)).not.toHaveAttribute('aria-invalid')
  })

  it('rechaza un enlace que no es una URL', async () => {
    mockApi(listRoutes)
    const { user } = renderApp('/applications/new')

    await user.type(screen.getByLabelText(/^Empresa/), 'Oracle')
    await user.type(screen.getByLabelText(/^Puesto/), 'Becario')
    await user.type(screen.getByLabelText('Enlace de la vacante'), 'occ.com.mx/123')
    await user.click(screen.getByRole('button', { name: 'Guardar postulación' }))

    expect(
      screen.getByText('Escribe una URL válida que empiece con http:// o https://.'),
    ).toBeInTheDocument()
  })

  it('envía los datos limpios y regresa a la lista con sus filtros', async () => {
    const { requests } = mockApi({
      ...listRoutes,
      'POST /applications': makeApplication({ id: 9, company: 'Kueski' }),
    })
    const { user } = renderApp({
      pathname: '/applications/new',
      state: { returnTo: '/?status=interview' },
    })

    await user.type(screen.getByLabelText(/^Empresa/), '  Kueski  ')
    await user.type(screen.getByLabelText(/^Puesto/), 'Becario de Datos')
    await user.selectOptions(screen.getByLabelText('Estado'), 'interview')
    await user.type(screen.getByLabelText('Fuente'), 'OCC')
    await user.click(screen.getByRole('button', { name: 'Guardar postulación' }))

    await waitFor(() => expect(currentLocation()).toBe('/?status=interview'))
    expect(screen.getByText('Postulación guardada')).toBeInTheDocument()
    const post = requests.find((request) => request.method === 'POST')
    expect(post?.body).toEqual({
      company: 'Kueski',
      position: 'Becario de Datos',
      status: 'interview',
      applied_on: todayIso(),
      job_url: null,
      source: 'OCC',
      notes: null,
    })
  })

  it('muestra junto a cada campo los errores que devuelve la API', async () => {
    mockApi({
      ...listRoutes,
      'POST /applications': errorResponse(
        422,
        'validation_error',
        'Algunos campos no son válidos.',
        {
          applied_on: ['La fecha no puede ser futura.'],
        },
      ),
    })
    const { user } = renderApp('/applications/new')

    await user.type(screen.getByLabelText(/^Empresa/), 'Oracle')
    await user.type(screen.getByLabelText(/^Puesto/), 'Becario')
    await user.click(screen.getByRole('button', { name: 'Guardar postulación' }))

    expect(await screen.findByText('La fecha no puede ser futura.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Fecha de postulación/)).toHaveAttribute('aria-invalid', 'true')
    expect(currentLocation()).toBe('/applications/new')
    expect(screen.getByRole('button', { name: 'Guardar postulación' })).toBeEnabled()
  })

  it('si la API falla por otra razón, muestra el mensaje arriba del formulario', async () => {
    mockApi({
      ...listRoutes,
      'POST /applications': errorResponse(500, 'internal_error', 'Ocurrió un error inesperado.'),
    })
    const { user } = renderApp('/applications/new')

    await user.type(screen.getByLabelText(/^Empresa/), 'Oracle')
    await user.type(screen.getByLabelText(/^Puesto/), 'Becario')
    await user.click(screen.getByRole('button', { name: 'Guardar postulación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    expect(screen.getByLabelText(/^Empresa/)).toHaveValue('Oracle')
  })

  it('no envía dos veces aunque se haga doble clic', async () => {
    let respond: (value: unknown) => void = () => {}
    const { requests } = mockApi({
      ...listRoutes,
      'POST /applications': () =>
        new Promise((resolve) => {
          respond = resolve
        }),
    })
    const { user } = renderApp('/applications/new')

    await user.type(screen.getByLabelText(/^Empresa/), 'Oracle')
    await user.type(screen.getByLabelText(/^Puesto/), 'Becario')
    await user.dblClick(screen.getByRole('button', { name: 'Guardar postulación' }))

    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    respond(makeApplication())
    await waitFor(() => expect(currentLocation()).toBe('/'))
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(1)
  })
})

describe('editar postulación (HU-04)', () => {
  const application = makeApplication({
    id: 7,
    company: 'Bosch',
    position: 'Practicante QA',
    status: 'applied',
    notes: 'Llamar el lunes',
  })

  it('carga los datos, envía los cambios y avisa', async () => {
    const { requests } = mockApi({
      ...listRoutes,
      'GET /applications/:id': application,
      'PATCH /applications/:id': { ...application, status: 'offer', notes: null },
    })
    const { user } = renderApp('/applications/7/edit')

    expect(await screen.findByLabelText(/^Empresa/)).toHaveValue('Bosch')
    expect(screen.getByLabelText('Notas')).toHaveValue('Llamar el lunes')

    await user.selectOptions(screen.getByLabelText('Estado'), 'offer')
    await user.clear(screen.getByLabelText('Notas'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(currentLocation()).toBe('/'))
    expect(screen.getByText('Cambios guardados')).toBeInTheDocument()
    const patch = requests.find((request) => request.method === 'PATCH')
    expect(patch?.path).toBe('/applications/7')
    expect(patch?.body).toMatchObject({ company: 'Bosch', status: 'offer', notes: null })
  })

  it('si la postulación no existe, lo dice', async () => {
    mockApi({
      'GET /applications/:id': errorResponse(
        404,
        'not_found',
        'No existe la postulación con id 99.',
      ),
    })
    renderApp('/applications/99/edit')

    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta postulación' }),
    ).toBeInTheDocument()
  })

  it('un id que no es número tampoco existe', async () => {
    const { requests } = mockApi({})
    renderApp('/applications/abc/edit')

    expect(
      screen.getByRole('heading', { name: 'No encontramos esta postulación' }),
    ).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
})
