import { STATUSES, type Status } from '../api/types'

export const STATUS_LABELS: Record<Status, string> = {
  applied: 'Postulado',
  interview: 'Entrevista',
  offer: 'Oferta',
  rejected: 'Rechazado',
}

export const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}
