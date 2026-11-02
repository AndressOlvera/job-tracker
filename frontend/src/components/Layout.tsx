import { Link, Outlet, useLocation } from 'react-router'
import styles from './Layout.module.css'

export function Layout() {
  const { pathname } = useLocation()
  const inApplications = pathname === '/' || pathname.startsWith('/applications')
  const inStats = pathname.startsWith('/stats')

  return (
    <>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to="/" className={styles.brand}>
            <span className={styles.mark} aria-hidden="true" />
            Job Tracker
          </Link>
          <nav aria-label="Principal">
            <ul className={styles.nav}>
              <li>
                <Link
                  to="/"
                  className={styles.navLink}
                  aria-current={inApplications ? 'page' : undefined}
                >
                  Postulaciones
                </Link>
              </li>
              <li>
                <Link
                  to="/stats"
                  className={styles.navLink}
                  aria-current={inStats ? 'page' : undefined}
                >
                  Estadísticas
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="contenido" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </>
  )
}
