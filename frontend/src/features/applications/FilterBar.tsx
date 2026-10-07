import { useEffect, useEffectEvent, useId, useState } from 'react'
import { MAX_QUERY_LENGTH } from './filters'
import styles from './FilterBar.module.css'

const SEARCH_DELAY_MS = 300

interface FilterBarProps {
  query?: string
  appliedFrom?: string
  appliedTo?: string
  /** Si la fecha final quedó antes de la inicial (ese rango no se aplica). */
  invalidRange: boolean
  showClear: boolean
  onSearch: (query: string | undefined) => void
  onDatesChange: (dates: { applied_from?: string; applied_to?: string }) => void
  onClear: () => void
}

export function FilterBar({
  query,
  appliedFrom,
  appliedTo,
  invalidRange,
  showClear,
  onSearch,
  onDatesChange,
  onClear,
}: FilterBarProps) {
  const id = useId()
  // El texto se guarda aquí mientras escribes; la URL se actualiza al dejar de
  // escribir (300 ms) para no pedir una lista nueva con cada tecla.
  const [text, setText] = useState(query ?? '')
  const [syncedQuery, setSyncedQuery] = useState(query)

  // Si la búsqueda cambia desde fuera (botón "Limpiar filtros", atrás/adelante
  // del navegador), el campo se actualiza para coincidir con la URL.
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    if ((query ?? '') !== text.trim()) setText(query ?? '')
  }

  const search = useEffectEvent((value: string) => onSearch(value || undefined))

  useEffect(() => {
    const value = text.trim()
    if (value === (query ?? '')) return
    const timer = setTimeout(() => search(value), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text, query])

  return (
    <div className={styles.bar}>
      <div className={styles.search}>
        <label className="field-label" htmlFor={`${id}-q`}>
          Buscar
        </label>
        <input
          id={`${id}-q`}
          className="input"
          type="search"
          placeholder="Empresa o puesto"
          maxLength={MAX_QUERY_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className={styles.date}>
        <label className="field-label" htmlFor={`${id}-from`}>
          Desde
        </label>
        <input
          id={`${id}-from`}
          className="input"
          type="date"
          value={appliedFrom ?? ''}
          max={appliedTo}
          onChange={(event) => onDatesChange({ applied_from: event.target.value || undefined })}
        />
      </div>
      <div className={styles.date}>
        <label className="field-label" htmlFor={`${id}-to`}>
          Hasta
        </label>
        <input
          id={`${id}-to`}
          className="input"
          type="date"
          value={appliedTo ?? ''}
          min={appliedFrom}
          aria-invalid={invalidRange || undefined}
          aria-describedby={invalidRange ? `${id}-range` : undefined}
          onChange={(event) => onDatesChange({ applied_to: event.target.value || undefined })}
        />
      </div>
      {showClear && (
        <button type="button" className={`btn btn-link ${styles.clear}`} onClick={onClear}>
          Limpiar filtros
        </button>
      )}
      {invalidRange && (
        <p id={`${id}-range`} className={`field-error ${styles.rangeError}`}>
          La fecha final es anterior a la inicial, así que no se aplicó.
        </p>
      )}
    </div>
  )
}
