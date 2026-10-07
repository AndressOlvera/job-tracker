import { STATUSES, type Status } from '../../api/types'
import { formatNumber } from '../../lib/format'
import { STATUS_LABELS } from '../../lib/status'
import styles from './StatusFilter.module.css'

interface StatusFilterProps {
  value?: Status
  /** Totales por estado (de /stats). Mientras cargan, los botones se muestran sin números. */
  counts?: Record<Status, number>
  onChange: (status: Status | undefined) => void
}

/**
 * Filtro por estado. Arriba, una barra muestra en qué proporción están todas tus
 * postulaciones; debajo, un botón por estado con su total.
 */
export function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
  const total = counts ? STATUSES.reduce((sum, status) => sum + counts[status], 0) : undefined

  return (
    <div className={styles.filter}>
      <div className={styles.strip} aria-hidden="true">
        {counts && total
          ? STATUSES.filter((status) => counts[status] > 0).map((status) => (
              <span
                key={status}
                className={styles.segment}
                data-status={status}
                data-dimmed={value !== undefined && value !== status}
                style={{ flexGrow: counts[status] }}
              />
            ))
          : null}
      </div>
      <div className={styles.options} role="group" aria-label="Filtrar por estado">
        <button
          type="button"
          className={styles.option}
          aria-pressed={value === undefined}
          onClick={() => onChange(undefined)}
        >
          Todas
          {total !== undefined && <span className={styles.count}>{formatNumber(total)}</span>}
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={styles.option}
            data-status={status}
            aria-pressed={value === status}
            onClick={() => onChange(status)}
          >
            <span className={styles.dot} aria-hidden="true" />
            {STATUS_LABELS[status]}
            {counts && <span className={styles.count}>{formatNumber(counts[status])}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
