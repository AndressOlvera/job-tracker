import { useState } from 'react'
import { STATUSES, type Status } from '../../api/types'
import { formatNumber, formatPercent, pluralize } from '../../lib/format'
import { STATUS_LABELS } from '../../lib/status'
import styles from './charts.module.css'

interface StatusBarChartProps {
  byStatus: Record<Status, number>
  total: number
}

/** Barras horizontales: cuántas postulaciones hay en cada estado. */
export function StatusBarChart({ byStatus, total }: StatusBarChartProps) {
  const [active, setActive] = useState<Status | null>(null)
  const max = Math.max(...STATUSES.map((status) => byStatus[status]), 1)

  return (
    <div className={styles.bars} role="list" aria-label="Postulaciones por estado">
      {STATUSES.map((status) => {
        const count = byStatus[status]
        const share = total > 0 ? count / total : 0
        return (
          <div
            key={status}
            className={styles.barRow}
            role="listitem"
            tabIndex={0}
            aria-label={`${STATUS_LABELS[status]}: ${pluralize(count, 'postulación', 'postulaciones')}, ${formatPercent(share)} del total`}
            onMouseEnter={() => setActive(status)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(status)}
            onBlur={() => setActive(null)}
          >
            <span className={styles.barLabel} aria-hidden="true">
              {STATUS_LABELS[status]}
            </span>
            <span className={styles.barTrack} aria-hidden="true">
              <span
                className={styles.bar}
                data-status={status}
                data-active={active === status}
                style={{ width: `${(count / max) * 100}%` }}
              />
              <span className={styles.barValue}>{formatNumber(count)}</span>
              {active === status && (
                <span className={styles.tooltip} style={{ left: `${(count / max) * 100}%` }}>
                  <strong>{formatPercent(share)}</strong> del total
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
