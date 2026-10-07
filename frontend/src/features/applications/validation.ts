// Reglas del formulario. Son las mismas que aplica la API (docs/03-api.md), así
// el usuario ve los errores antes de enviar. La API vuelve a validar de todos modos.

import type { Application, ApplicationInput, Status } from '../../api/types'
import { isIsoDate } from '../../lib/dates'

/** Los valores tal como están en el formulario: todo es texto. */
export interface ApplicationFormValues {
  company: string
  position: string
  status: Status
  applied_on: string
  job_url: string
  source: string
  notes: string
}

export type FormField = keyof ApplicationFormValues
export type FormErrors = Partial<Record<FormField, string>>

export const MAX_LENGTH = {
  company: 120,
  position: 120,
  job_url: 500,
  source: 60,
  notes: 5000,
} as const

export const MESSAGES = {
  required: 'Este campo es obligatorio.',
  tooLong: (max: number) => `Debe tener como máximo ${max} caracteres.`,
  invalidDate: 'Debe ser una fecha con formato AAAA-MM-DD.',
  futureDate: 'La fecha no puede ser futura.',
  invalidUrl: 'Escribe una URL válida que empiece con http:// o https://.',
}

export function emptyFormValues(today: string): ApplicationFormValues {
  return {
    company: '',
    position: '',
    status: 'applied',
    applied_on: today,
    job_url: '',
    source: '',
    notes: '',
  }
}

export function toFormValues(application: Application): ApplicationFormValues {
  return {
    company: application.company,
    position: application.position,
    status: application.status,
    applied_on: application.applied_on,
    job_url: application.job_url ?? '',
    source: application.source ?? '',
    notes: application.notes ?? '',
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

export function validateApplication(values: ApplicationFormValues, today: string): FormErrors {
  const errors: FormErrors = {}

  for (const field of ['company', 'position'] as const) {
    const value = values[field].trim()
    if (!value) errors[field] = MESSAGES.required
    else if (value.length > MAX_LENGTH[field]) errors[field] = MESSAGES.tooLong(MAX_LENGTH[field])
  }

  if (!values.applied_on) errors.applied_on = MESSAGES.required
  else if (!isIsoDate(values.applied_on)) errors.applied_on = MESSAGES.invalidDate
  else if (values.applied_on > today) errors.applied_on = MESSAGES.futureDate

  const jobUrl = values.job_url.trim()
  if (jobUrl.length > MAX_LENGTH.job_url) errors.job_url = MESSAGES.tooLong(MAX_LENGTH.job_url)
  else if (jobUrl && !isHttpUrl(jobUrl)) errors.job_url = MESSAGES.invalidUrl

  for (const field of ['source', 'notes'] as const) {
    if (values[field].trim().length > MAX_LENGTH[field]) {
      errors[field] = MESSAGES.tooLong(MAX_LENGTH[field])
    }
  }

  return errors
}

/** Lo que se envía a la API: sin espacios sobrantes y con null en lo opcional vacío. */
export function toApplicationInput(values: ApplicationFormValues): ApplicationInput {
  const optional = (value: string) => value.trim() || null
  return {
    company: values.company.trim(),
    position: values.position.trim(),
    status: values.status,
    applied_on: values.applied_on,
    job_url: optional(values.job_url),
    source: optional(values.source),
    notes: optional(values.notes),
  }
}
