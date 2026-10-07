import type { Status } from '../api/types'
import { STATUS_LABELS } from '../lib/status'
import styles from './StatusBadge.module.css'

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={styles.badge} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
