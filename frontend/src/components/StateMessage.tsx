import type { ReactNode } from 'react'
import styles from './StateMessage.module.css'

interface StateMessageProps {
  title: string
  children?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'error'
}

/** Mensaje para cuando no hay datos o algo falló: dice qué pasó y qué hacer. */
export function StateMessage({ title, children, action, tone = 'neutral' }: StateMessageProps) {
  return (
    <div className={styles.box} data-tone={tone} role={tone === 'error' ? 'alert' : undefined}>
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
