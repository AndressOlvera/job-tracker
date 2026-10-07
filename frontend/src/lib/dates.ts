// Fechas como texto AAAA-MM-DD, el mismo formato que usa la API.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  // Descarta fechas imposibles como 2026-02-31.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** La fecha de hoy en la zona horaria del navegador (no en UTC). */
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Todos los meses entre dos meses AAAA-MM, incluidos ambos. */
export function monthRange(first: string, last: string): string[] {
  const months: string[] = []
  let [year, month] = first.split('-').map(Number)
  const [lastYear, lastMonth] = last.split('-').map(Number)
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}
