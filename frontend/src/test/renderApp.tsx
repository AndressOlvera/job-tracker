// Renderiza la aplicación completa en una ruta, con los mismos proveedores que main.tsx.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { App } from '../App'
import { ToastProvider } from '../components/toast/ToastProvider'

type Route = string | { pathname: string; search?: string; state?: unknown }

/** Muestra la URL actual para que las pruebas puedan revisarla. */
function LocationDisplay() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

export function renderApp(route: Route = '/') {
  // Un cliente nuevo por prueba (sin caché compartida) y sin reintentos.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const user = userEvent.setup()
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <App />
          <LocationDisplay />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { user, queryClient, ...result }
}

export function currentLocation(): string | null {
  return screen.getByTestId('location').textContent
}
