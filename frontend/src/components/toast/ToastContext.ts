import { createContext, useContext } from 'react'

export interface ToastApi {
  /** Muestra un aviso breve, por ejemplo "Postulación guardada". */
  show: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast debe usarse dentro de <ToastProvider>.')
  return toast
}
