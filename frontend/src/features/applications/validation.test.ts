import { describe, expect, it } from 'vitest'
import { makeApplication } from '../../test/fixtures'
import {
  emptyFormValues,
  toApplicationInput,
  toFormValues,
  validateApplication,
  type ApplicationFormValues,
} from './validation'

const TODAY = '2026-10-05'
const valid: ApplicationFormValues = {
  ...emptyFormValues(TODAY),
  company: 'Oracle',
  position: 'Becario de Software',
}

describe('validateApplication', () => {
  it('sin errores cuando los datos son válidos', () => {
    expect(validateApplication(valid, TODAY)).toEqual({})
  })

  it('empresa y puesto son obligatorios (los espacios no cuentan)', () => {
    expect(validateApplication({ ...valid, company: '   ', position: '' }, TODAY)).toEqual({
      company: 'Este campo es obligatorio.',
      position: 'Este campo es obligatorio.',
    })
  })

  it('revisa la fecha', () => {
    expect(validateApplication({ ...valid, applied_on: '' }, TODAY).applied_on).toBe(
      'Este campo es obligatorio.',
    )
    expect(validateApplication({ ...valid, applied_on: '2026-10-06' }, TODAY).applied_on).toBe(
      'La fecha no puede ser futura.',
    )
    expect(validateApplication({ ...valid, applied_on: TODAY }, TODAY)).toEqual({})
  })

  it.each(['occ.com.mx/vacante', 'ftp://example.com', 'https://'])(
    'rechaza el enlace "%s"',
    (jobUrl) => {
      expect(validateApplication({ ...valid, job_url: jobUrl }, TODAY).job_url).toBe(
        'Escribe una URL válida que empiece con http:// o https://.',
      )
    },
  )

  it('revisa los largos máximos', () => {
    const errors = validateApplication(
      { ...valid, company: 'x'.repeat(121), source: 'x'.repeat(61), notes: 'x'.repeat(5001) },
      TODAY,
    )
    expect(errors).toEqual({
      company: 'Debe tener como máximo 120 caracteres.',
      source: 'Debe tener como máximo 60 caracteres.',
      notes: 'Debe tener como máximo 5000 caracteres.',
    })
  })
})

describe('toApplicationInput', () => {
  it('quita espacios y manda null en los campos opcionales vacíos', () => {
    expect(
      toApplicationInput({ ...valid, company: '  Oracle ', source: '  ', job_url: '', notes: '' }),
    ).toEqual({
      company: 'Oracle',
      position: 'Becario de Software',
      status: 'applied',
      applied_on: TODAY,
      job_url: null,
      source: null,
      notes: null,
    })
  })
})

describe('toFormValues', () => {
  it('convierte los null de la API en texto vacío para el formulario', () => {
    const values = toFormValues(makeApplication({ job_url: null, notes: null }))
    expect(values.job_url).toBe('')
    expect(values.notes).toBe('')
  })
})
