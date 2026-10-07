import { useEffect, useId, useRef } from 'react'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  pendingLabel: string
  isPending: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Ventana de confirmación con el elemento nativo <dialog>: el navegador ya se
 * encarga de bloquear el resto de la página, de mantener el foco adentro y de
 * cerrar con la tecla Esc. Se muestra mientras el componente está montado.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    // Para una acción que no se puede deshacer, el foco empieza en "Cancelar".
    cancelRef.current?.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        // Esc: se cierra solo si no hay una operación en curso.
        event.preventDefault()
        if (!isPending) onCancel()
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={descriptionId} className={styles.description}>
        {description}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          ref={cancelRef}
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
