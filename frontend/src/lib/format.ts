// Formatos para mostrar datos en pantalla.

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const numberFormat = new Intl.NumberFormat('es-MX')

/** "2026-09-28" → "28/09/2026". Se arma a mano para no depender de la zona horaria. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/** "2026-09" → "sep 2026" (corto) o "septiembre 2026" (largo). */
export function formatMonth(month: string, style: 'short' | 'long' = 'short'): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const names = style === 'short' ? MONTHS_SHORT : MONTHS_LONG
  return `${names[monthNumber - 1]} ${year}`
}

/** Espacio que no se separa: el "%" nunca queda solo en otra línea. */
const NBSP = '\u00A0'

/** 0.375 → "37.5 %" (con un espacio que no se separa del número). */
export function formatPercent(rate: number): string {
  const value = Math.round(rate * 1000) / 10
  return `${numberFormat.format(value)}${NBSP}%`
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** "1 postulación", "3 postulaciones" */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}
