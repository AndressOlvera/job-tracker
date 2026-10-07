import { Link } from 'react-router'
import type { Application, Sort, SortField } from '../../api/types'
import { ExternalLinkIcon, PencilIcon, SortIcon, TrashIcon } from '../../components/icons'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate } from '../../lib/format'
import styles from './ApplicationsTable.module.css'

interface ApplicationsTableProps {
  items: Application[]
  sort: Sort
  /** Mientras llega la página nueva, la tabla anterior se atenúa en lugar de desaparecer. */
  isRefreshing: boolean
  /** A dónde regresar después de editar (la lista con sus filtros). */
  returnTo: string
  onSort: (field: SortField) => void
  onDelete: (application: Application) => void
}

const SORT_LABELS: Record<SortField, string> = {
  company: 'empresa',
  status: 'estado',
  applied_on: 'fecha de postulación',
  created_at: 'fecha de registro',
}

function sortDirection(sort: Sort, field: SortField) {
  if (sort === field) return 'ascending'
  if (sort === `-${field}`) return 'descending'
  return 'none'
}

function SortableHeader({
  field,
  label,
  sort,
  onSort,
}: {
  field: SortField
  label: string
  sort: Sort
  onSort: (field: SortField) => void
}) {
  const direction = sortDirection(sort, field)
  return (
    <th scope="col" aria-sort={direction}>
      <button type="button" className={styles.sortButton} onClick={() => onSort(field)}>
        {label}
        <SortIcon direction={direction} />
      </button>
    </th>
  )
}

export function ApplicationsTable({
  items,
  sort,
  isRefreshing,
  returnTo,
  onSort,
  onDelete,
}: ApplicationsTableProps) {
  const field = sort.replace(/^-/, '') as SortField
  const descending = sort.startsWith('-')

  return (
    <div className={styles.wrap} data-refreshing={isRefreshing} aria-busy={isRefreshing}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          Postulaciones ordenadas por {SORT_LABELS[field]}, en orden{' '}
          {descending ? 'descendente' : 'ascendente'}
        </caption>
        <thead>
          <tr>
            <SortableHeader field="company" label="Empresa" sort={sort} onSort={onSort} />
            <th scope="col">Puesto</th>
            <SortableHeader field="status" label="Estado" sort={sort} onSort={onSort} />
            <SortableHeader field="applied_on" label="Fecha" sort={sort} onSort={onSort} />
            <th scope="col">Fuente</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((application) => (
            <tr key={application.id}>
              <td className={styles.company} data-label="Empresa">
                {application.company}
              </td>
              <td className={styles.position} data-label="Puesto">
                {application.position}
              </td>
              <td className={styles.status} data-label="Estado">
                <StatusBadge status={application.status} />
              </td>
              <td className={styles.date} data-label="Fecha">
                {formatDate(application.applied_on)}
              </td>
              <td className={styles.source} data-label="Fuente">
                {application.source ?? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="visually-hidden">Sin fuente</span>
                  </>
                )}
              </td>
              <td className={styles.actions}>
                {application.job_url && (
                  <a
                    className="btn btn-icon"
                    href={application.job_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir la vacante de ${application.company} en una pestaña nueva`}
                    title="Abrir la vacante"
                  >
                    <ExternalLinkIcon />
                  </a>
                )}
                <Link
                  className="btn btn-icon"
                  to={`/applications/${application.id}/edit`}
                  state={{ returnTo }}
                  aria-label={`Editar la postulación a ${application.company}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Link>
                <button
                  type="button"
                  className={`btn btn-icon ${styles.delete}`}
                  onClick={() => onDelete(application)}
                  aria-label={`Eliminar la postulación a ${application.company}`}
                  title="Eliminar"
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Filas grises mientras llega la primera respuesta. */
export function ApplicationsTableSkeleton() {
  return (
    <div className={styles.wrap}>
      <p className="visually-hidden" role="status">
        Cargando postulaciones…
      </p>
      <div className={styles.skeleton} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={styles.skeletonRow}>
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  )
}
