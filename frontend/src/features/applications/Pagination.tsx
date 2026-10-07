import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  pages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null
  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span className={styles.current}>
        Página {page} de {pages}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  )
}
