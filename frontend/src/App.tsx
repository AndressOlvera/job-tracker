import { Link, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { StateMessage } from './components/StateMessage'
import { ApplicationsPage } from './features/applications/ApplicationsPage'
import { EditApplicationPage } from './features/applications/EditApplicationPage'
import { NewApplicationPage } from './features/applications/NewApplicationPage'
import { StatsPage } from './features/stats/StatsPage'

/** Rutas de la aplicación (ver docs/04-pantallas.md). */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ApplicationsPage />} />
        <Route path="applications/new" element={<NewApplicationPage />} />
        <Route path="applications/:id/edit" element={<EditApplicationPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function NotFoundPage() {
  return (
    <>
      <title>Página no encontrada – Job Tracker</title>
      <StateMessage
        title="Esta página no existe"
        action={
          <Link to="/" className="btn btn-secondary">
            Ir a mis postulaciones
          </Link>
        }
      >
        Revisa la dirección o regresa a la lista.
      </StateMessage>
    </>
  )
}
