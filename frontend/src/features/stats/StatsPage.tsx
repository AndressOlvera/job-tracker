import { Link } from 'react-router'
import { useStats } from '../../api/queries'
import { STATUSES } from '../../api/types'
import { StateMessage } from '../../components/StateMessage'
import { formatMonth, formatNumber, formatPercent } from '../../lib/format'
import { STATUS_LABELS } from '../../lib/status'
import { fillMonths, MAX_MONTHS } from './chartData'
import { MonthlyChart } from './MonthlyChart'
import { StatusBarChart } from './StatusBarChart'
import styles from './StatsPage.module.css'

export function StatsPage() {
  const stats = useStats()

  let content
  if (stats.isPending) {
    content = <p role="status">Cargando estadísticas…</p>
  } else if (stats.isError) {
    content = (
      <StateMessage
        tone="error"
        title="No se pudieron cargar las estadísticas"
        action={
          <button type="button" className="btn btn-secondary" onClick={() => stats.refetch()}>
            Reintentar
          </button>
        }
      >
        {stats.error.message}
      </StateMessage>
    )
  } else {
    const data = stats.data
    const months = fillMonths(data.by_month)
    content = (
      <>
        <dl className={styles.figures}>
          <div className={styles.figure}>
            <dt>Postulaciones</dt>
            <dd className={styles.value}>{formatNumber(data.total)}</dd>
            <dd className={styles.note}>Todas las que has registrado.</dd>
          </div>
          <div className={styles.figure}>
            <dt>Tasa de respuesta</dt>
            <dd className={styles.value}>{formatPercent(data.response_rate)}</dd>
            <dd className={styles.note}>
              Recibieron alguna respuesta: entrevista, oferta o rechazo.
            </dd>
          </div>
          <div className={styles.figure}>
            <dt>Tasa de entrevistas</dt>
            <dd className={styles.value}>{formatPercent(data.interview_rate)}</dd>
            <dd className={styles.note}>Llegaron a entrevista u oferta.</dd>
          </div>
          <div className={styles.figure}>
            <dt>Ofertas</dt>
            <dd className={styles.value}>{formatNumber(data.by_status.offer)}</dd>
            <dd className={styles.note}>Procesos que terminaron en una oferta.</dd>
          </div>
        </dl>

        {data.total === 0 ? (
          <StateMessage
            title="Las gráficas aparecerán con tu primera postulación"
            action={
              <Link to="/applications/new" className="btn btn-primary">
                Registrar una postulación
              </Link>
            }
          />
        ) : (
          <div className={styles.charts}>
            <figure className={styles.chartCard}>
              <figcaption>
                <h2>Por estado</h2>
                <p className={styles.chartNote}>En qué etapa está cada postulación hoy.</p>
              </figcaption>
              <StatusBarChart byStatus={data.by_status} total={data.total} />
              <details className={styles.dataTable}>
                <summary>Ver los datos en una tabla</summary>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Estado</th>
                      <th scope="col">Postulaciones</th>
                      <th scope="col">Del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STATUSES.map((status) => (
                      <tr key={status}>
                        <th scope="row">{STATUS_LABELS[status]}</th>
                        <td>{formatNumber(data.by_status[status])}</td>
                        <td>{formatPercent(data.by_status[status] / data.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </figure>

            <figure className={styles.chartCard}>
              <figcaption>
                <h2>Por mes</h2>
                <p className={styles.chartNote}>
                  Cuántas enviaste cada mes
                  {data.by_month.length > MAX_MONTHS ? ' (últimos 12 meses).' : '.'}
                </p>
              </figcaption>
              <MonthlyChart months={months} />
              <details className={styles.dataTable}>
                <summary>Ver los datos en una tabla</summary>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Mes</th>
                      <th scope="col">Postulaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((item) => (
                      <tr key={item.month}>
                        <th scope="row">{formatMonth(item.month, 'long')}</th>
                        <td>{formatNumber(item.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </figure>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <title>Estadísticas – Job Tracker</title>
      <div className={styles.header}>
        <h1>Estadísticas</h1>
        <p className={styles.lead}>Cómo va tu búsqueda, contando todas tus postulaciones.</p>
      </div>
      {content}
    </>
  )
}
