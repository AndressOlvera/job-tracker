import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useApplications, useDeleteApplication, useStats } from '../../api/queries'
import type { Application, ApplicationFilters, SortField, Status } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PlusIcon } from '../../components/icons'
import { StateMessage } from '../../components/StateMessage'
import { useToast } from '../../components/toast/ToastContext'
import { isIsoDate } from '../../lib/dates'
import { formatNumber, pluralize } from '../../lib/format'
import { ApplicationsTable, ApplicationsTableSkeleton } from './ApplicationsTable'
import { FilterBar } from './FilterBar'
import { hasActiveFilters, nextSort, parseFilters, toSearchParams } from './filters'
import { Pagination } from './Pagination'
import { StatusFilter } from './StatusFilter'
import styles from './ApplicationsPage.module.css'

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const filters = parseFilters(searchParams)
  const applications = useApplications(filters)
  const stats = useStats()
  const deletion = useDeleteApplication()
  const toast = useToast()
  const [toDelete, setToDelete] = useState<Application | null>(null)

  const data = applications.data
  const returnTo = location.pathname + location.search

  /** Cambia algunos filtros. Cualquier cambio regresa a la página 1, salvo que se indique otra. */
  function updateFilters(changes: Partial<ApplicationFilters>, options?: { replace?: boolean }) {
    setSearchParams(toSearchParams({ ...filters, page: 1, ...changes }), options)
  }

  function clearFilters() {
    setSearchParams(toSearchParams({ sort: filters.sort, page: 1 }))
  }

  // Si la página actual se quedó vacía (por ejemplo, al eliminar la última
  // postulación de la última página), se pasa a la última página que sí existe.
  const outOfRange =
    data !== undefined &&
    !applications.isPlaceholderData &&
    data.items.length === 0 &&
    data.total > 0 &&
    filters.page > data.pages
  const lastPage = data?.pages ?? 1
  useEffect(() => {
    if (!outOfRange) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (lastPage > 1) next.set('page', String(lastPage))
        else next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [outOfRange, lastPage, setSearchParams])

  function openDeleteDialog(application: Application) {
    deletion.reset()
    setToDelete(application)
  }

  function confirmDelete() {
    if (!toDelete) return
    deletion.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null)
        toast.show('Postulación eliminada')
      },
    })
  }

  // Las fechas tal como están en la URL, para que el campo no se borre si el
  // rango quedó al revés (en ese caso parseFilters ignora la fecha final).
  const rawFrom = searchParams.get('applied_from') ?? ''
  const rawTo = searchParams.get('applied_to') ?? ''
  const inputFrom = isIsoDate(rawFrom) ? rawFrom : undefined
  const inputTo = isIsoDate(rawTo) ? rawTo : undefined
  const invalidRange = Boolean(inputFrom && inputTo && inputTo < inputFrom)
  const filtering = hasActiveFilters(filters) || invalidRange

  let content
  if (applications.isPending) {
    content = <ApplicationsTableSkeleton />
  } else if (!data) {
    content = (
      <StateMessage
        tone="error"
        title="No se pudo cargar la lista"
        action={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => applications.refetch()}
          >
            Reintentar
          </button>
        }
      >
        {applications.error?.message}
      </StateMessage>
    )
  } else if (data.total === 0 && !filtering) {
    content = (
      <StateMessage
        title="Aún no registras postulaciones"
        action={
          <Link to="/applications/new" state={{ returnTo }} className="btn btn-primary">
            Registrar la primera
          </Link>
        }
      >
        Agrega cada vacante a la que apliques para saber en qué va cada proceso.
      </StateMessage>
    )
  } else if (data.total === 0) {
    content = (
      <StateMessage
        title="Ninguna postulación coincide con los filtros"
        action={
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            Limpiar filtros
          </button>
        }
      >
        Prueba con otra búsqueda u otro rango de fechas.
      </StateMessage>
    )
  } else {
    content = (
      <>
        <ApplicationsTable
          items={data.items}
          sort={filters.sort}
          isRefreshing={applications.isPlaceholderData}
          returnTo={returnTo}
          onSort={(field: SortField) => updateFilters({ sort: nextSort(filters.sort, field) })}
          onDelete={openDeleteDialog}
        />
        <div className={styles.footer}>
          <Pagination
            page={data.page}
            pages={data.pages}
            onPageChange={(page) => updateFilters({ page })}
          />
        </div>
      </>
    )
  }

  // "Mostrando 21–24 de 24"
  const first = data ? (data.page - 1) * data.per_page + 1 : 0
  const last = data ? first + data.items.length - 1 : 0

  return (
    <>
      <title>Postulaciones – Job Tracker</title>
      <div className={styles.header}>
        <div>
          <h1>Postulaciones</h1>
          {/* Mientras cargan los datos, un espacio reserva la línea para que nada salte. */}
          <p className={styles.lead}>
            {stats.data
              ? stats.data.total === 0
                ? 'Todavía no hay ninguna registrada.'
                : `${pluralize(stats.data.total, 'registrada', 'registradas')} en total.`
              : '\u00A0'}
          </p>
        </div>
        <Link to="/applications/new" state={{ returnTo }} className="btn btn-primary">
          <PlusIcon />
          Nueva postulación
        </Link>
      </div>

      <section className={styles.filters} aria-label="Filtros">
        <StatusFilter
          value={filters.status}
          counts={stats.data?.by_status}
          onChange={(status: Status | undefined) => updateFilters({ status })}
        />
        <FilterBar
          query={filters.q}
          appliedFrom={inputFrom}
          appliedTo={inputTo}
          invalidRange={invalidRange}
          showClear={filtering}
          onSearch={(q) => updateFilters({ q }, { replace: true })}
          onDatesChange={(dates) =>
            setSearchParams((current) => {
              const next = new URLSearchParams(current)
              for (const [key, value] of Object.entries(dates)) {
                if (value) next.set(key, value)
                else next.delete(key)
              }
              next.delete('page')
              return next
            })
          }
          onClear={clearFilters}
        />
      </section>

      <p className={styles.summary} aria-live="polite">
        {data && data.items.length > 0
          ? `Mostrando ${formatNumber(first)}–${formatNumber(last)} de ${formatNumber(data.total)}`
          : ''}
      </p>

      {content}

      {toDelete && (
        <ConfirmDialog
          title={`¿Eliminar la postulación a ${toDelete.company}?`}
          description={`${toDelete.position}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          pendingLabel="Eliminando…"
          isPending={deletion.isPending}
          error={deletion.error?.message}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  )
}
