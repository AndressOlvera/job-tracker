import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import type { ApplicationInput } from '../../api/types'
import { STATUS_OPTIONS } from '../../lib/status'
import {
  MAX_LENGTH,
  toApplicationInput,
  validateApplication,
  type ApplicationFormValues,
  type FormErrors,
  type FormField,
} from './validation'
import styles from './ApplicationForm.module.css'

const SOURCE_SUGGESTIONS = ['OCC', 'LinkedIn', 'Indeed', 'Sitio de la empresa', 'Referido']
const FIELD_ORDER: FormField[] = [
  'company',
  'position',
  'status',
  'applied_on',
  'job_url',
  'source',
  'notes',
]

interface ApplicationFormProps {
  initialValues: ApplicationFormValues
  /** Fecha de hoy (AAAA-MM-DD): límite para la fecha de postulación. */
  today: string
  submitLabel: string
  onSubmit: (input: ApplicationInput) => Promise<unknown>
  onCancel: () => void
}

/** Convierte los errores 422 de la API al mismo formato que la validación local. */
function errorsFromApi(error: ApiError): { fields: FormErrors; general?: string } {
  const fields: FormErrors = {}
  let general: string | undefined
  for (const [field, messages] of Object.entries(error.details)) {
    if ((FIELD_ORDER as string[]).includes(field)) fields[field as FormField] = messages[0]
    else general = messages[0]
  }
  if (!general && Object.keys(fields).length === 0) general = error.message
  return { fields, general }
}

interface FieldProps {
  inputId: string
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  wide?: boolean
  children: ReactNode
}

/** Etiqueta + campo + mensaje de ayuda o de error. */
function Field({ inputId, label, required, hint, error, wide, children }: FieldProps) {
  return (
    <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      <label className="field-label" htmlFor={inputId}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p id={`${inputId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

export function ApplicationForm({
  initialValues,
  today,
  submitLabel,
  onSubmit,
  onCancel,
}: ApplicationFormProps) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Además del estado (que deshabilita el botón al volver a dibujar), una ref
  // bloquea un segundo envío en el mismo instante, por ejemplo con doble clic.
  const submittingRef = useRef(false)

  function setValue<K extends FormField>(field: K, value: ApplicationFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    // Al corregir un campo, su error desaparece.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function focusFirstError(fieldErrors: FormErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field])
    const element = first && formRef.current?.elements.namedItem(first)
    if (element instanceof HTMLElement) element.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const localErrors = validateApplication(values, today)
    setGeneralError(null)
    setErrors(localErrors)
    if (Object.keys(localErrors).length > 0) {
      focusFirstError(localErrors)
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      await onSubmit(toApplicationInput(values))
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const { fields, general } = errorsFromApi(error)
        setErrors(fields)
        setGeneralError(general ?? null)
        focusFirstError(fields)
      } else {
        setGeneralError(
          error instanceof Error ? error.message : 'Ocurrió un error inesperado. Intenta de nuevo.',
        )
      }
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  /** Props comunes de cada campo: id, nombre y su relación con el mensaje de error. */
  function inputProps(field: FormField) {
    const error = errors[field]
    return {
      id: `${id}-${field}`,
      name: field,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${id}-${field}-error` : undefined,
    }
  }

  /** Props comunes del contenedor de cada campo. */
  function fieldProps(field: FormField) {
    return { inputId: `${id}-${field}`, error: errors[field] }
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.legend}>
        Los campos con <span aria-hidden="true">*</span>
        <span className="visually-hidden">asterisco</span> son obligatorios.
      </p>

      {generalError && (
        <p className={styles.generalError} role="alert">
          {generalError}
        </p>
      )}

      <div className={styles.grid}>
        <Field {...fieldProps('company')} label="Empresa" required>
          <input
            {...inputProps('company')}
            className="input"
            type="text"
            autoComplete="organization"
            maxLength={MAX_LENGTH.company}
            required
            value={values.company}
            onChange={(event) => setValue('company', event.target.value)}
          />
        </Field>

        <Field {...fieldProps('position')} label="Puesto" required>
          <input
            {...inputProps('position')}
            className="input"
            type="text"
            autoComplete="organization-title"
            maxLength={MAX_LENGTH.position}
            required
            value={values.position}
            onChange={(event) => setValue('position', event.target.value)}
          />
        </Field>

        <Field {...fieldProps('status')} label="Estado">
          <select
            {...inputProps('status')}
            className="input"
            value={values.status}
            onChange={(event) =>
              setValue('status', event.target.value as ApplicationFormValues['status'])
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field {...fieldProps('applied_on')} label="Fecha de postulación" required>
          <input
            {...inputProps('applied_on')}
            className="input"
            type="date"
            max={today}
            required
            value={values.applied_on}
            onChange={(event) => setValue('applied_on', event.target.value)}
          />
        </Field>

        <Field
          {...fieldProps('job_url')}
          label="Enlace de la vacante"
          hint="Por ejemplo, la página en OCC."
        >
          <input
            {...inputProps('job_url')}
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={MAX_LENGTH.job_url}
            value={values.job_url}
            onChange={(event) => setValue('job_url', event.target.value)}
          />
        </Field>

        <Field {...fieldProps('source')} label="Fuente" hint="Dónde encontraste la vacante.">
          <input
            {...inputProps('source')}
            className="input"
            type="text"
            list={`${id}-sources`}
            maxLength={MAX_LENGTH.source}
            value={values.source}
            onChange={(event) => setValue('source', event.target.value)}
          />
          <datalist id={`${id}-sources`}>
            {SOURCE_SUGGESTIONS.map((source) => (
              <option key={source} value={source} />
            ))}
          </datalist>
        </Field>

        <Field
          {...fieldProps('notes')}
          label="Notas"
          wide
          hint={`${values.notes.length} de ${MAX_LENGTH.notes} caracteres`}
        >
          <textarea
            {...inputProps('notes')}
            className="input"
            rows={5}
            maxLength={MAX_LENGTH.notes}
            value={values.notes}
            onChange={(event) => setValue('notes', event.target.value)}
          />
        </Field>
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
