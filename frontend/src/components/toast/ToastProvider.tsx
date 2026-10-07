import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi } from './ToastContext'
import styles from './Toast.module.css'

const DURATION_MS = 4000

interface Toast {
  id: number
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const api = useMemo<ToastApi>(
    () => ({ show: (message) => setToast({ id: Date.now(), message }) }),
    [],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* La región existe siempre para que los lectores de pantalla anuncien cada aviso nuevo. */}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <p key={toast.id} className={styles.toast}>
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  )
}
