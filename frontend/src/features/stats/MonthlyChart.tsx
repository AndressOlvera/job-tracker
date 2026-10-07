import { useState } from 'react'
import type { MonthCount } from '../../api/types'
import { formatMonth, formatNumber, pluralize } from '../../lib/format'
import { niceScale } from './chartData'
import styles from './charts.module.css'

interface MonthlyChartProps {
  months: MonthCount[]
}

/** Columnas: cuántas postulaciones se enviaron cada mes. */
export function MonthlyChart({ months }: MonthlyChartProps) {
  const [active, setActive] = useState<string | null>(null)
  const peak = Math.max(...months.map((item) => item.count))
  const { max, ticks } = niceScale(peak)
  const lastMonth = months[months.length - 1]?.month
  // Etiquetas selectivas: solo el mes más alto y el último, no un número en cada columna.
  const peakMonth = months.find((item) => item.count === peak)?.month

  return (
    <div className={styles.columnsChart}>
      <div className={styles.plot}>
        {ticks.map((tick) => (
          <div key={tick} className={styles.gridline} style={{ bottom: `${(tick / max) * 100}%` }}>
            <span className={styles.tickLabel}>{formatNumber(tick)}</span>
          </div>
        ))}
        <div className={styles.columns} role="list" aria-label="Postulaciones por mes">
          {months.map((item) => {
            const labeled = item.month === peakMonth || item.month === lastMonth
            return (
              <div
                key={item.month}
                className={styles.columnSlot}
                role="listitem"
                tabIndex={0}
                aria-label={`${formatMonth(item.month, 'long')}: ${pluralize(item.count, 'postulación', 'postulaciones')}`}
                onMouseEnter={() => setActive(item.month)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(item.month)}
                onBlur={() => setActive(null)}
              >
                <span
                  className={styles.column}
                  data-active={active === item.month}
                  style={{ height: `${(item.count / max) * 100}%` }}
                  aria-hidden="true"
                >
                  {labeled && item.count > 0 && (
                    <span className={styles.columnValue}>{formatNumber(item.count)}</span>
                  )}
                </span>
                {active === item.month && (
                  <span
                    className={styles.columnTooltip}
                    style={{ bottom: `${(item.count / max) * 100}%` }}
                    aria-hidden="true"
                  >
                    <strong>{pluralize(item.count, 'postulación', 'postulaciones')}</strong>
                    <span>{formatMonth(item.month, 'long')}</span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className={styles.axis} aria-hidden="true">
        {months.map((item, index) => {
          const [year, month] = item.month.split('-')
          // El año se escribe en el primer mes y cuando cambia (en enero).
          const showYear = index === 0 || month === '01'
          return (
            <span key={item.month} className={styles.axisLabel}>
              {formatMonth(item.month).split(' ')[0]}
              {showYear && <span className={styles.axisYear}>{year}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
