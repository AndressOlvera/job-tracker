import { useLocation } from 'react-router'

/**
 * A dónde regresar al terminar o cancelar el formulario: la lista con los
 * filtros que tenía (llega en el "state" del enlace) o, si no hay, la lista sola.
 */
export function useReturnTo(): string {
  const location = useLocation()
  const state = location.state as { returnTo?: unknown } | null
  const returnTo = state?.returnTo
  // Solo rutas internas: evita redirigir a otro sitio.
  return typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : '/'
}
