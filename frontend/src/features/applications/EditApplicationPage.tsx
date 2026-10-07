import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useApplication, useUpdateApplication } from '../../api/queries'
import { ArrowLeftIcon } from '../../components/icons'
import { StateMessage } from '../../components/StateMessage'
import { useToast } from '../../components/toast/ToastContext'
import { todayIso } from '../../lib/dates'
import { ApplicationForm } from './ApplicationForm'
import { useReturnTo } from './useReturnTo'
import { toFormValues } from './validation'
import styles from './FormPage.module.css'

export function EditApplicationPage() {
  const params = useParams()
  const id = Number(params.id)

  // Un id que no es número (por ejemplo /applications/abc/edit) no existe.
  if (!Number.isInteger(id) || id < 1) return <NotFound />
  // key={id}: si cambia el id, el formulario empieza de cero.
  return <EditApplication key={id} id={id} />
}

function EditApplication({ id }: { id: number }) {
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const toast = useToast()
  const application = useApplication(id)
  const update = useUpdateApplication(id)
  const [today] = useState(todayIso)

  const header = (
    <>
      <title>Editar postulación – Job Tracker</title>
      <Link to={returnTo} className={styles.back}>
        <ArrowLeftIcon />
        Volver a postulaciones
      </Link>
    </>
  )

  if (application.isPending) {
    return (
      <>
        {header}
        <p role="status">Cargando la postulación…</p>
      </>
    )
  }

  if (application.isError) {
    if (application.error instanceof ApiError && application.error.status === 404) {
      return <NotFound />
    }
    return (
      <>
        {header}
        <StateMessage
          tone="error"
          title="No se pudo cargar la postulación"
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => application.refetch()}
            >
              Reintentar
            </button>
          }
        >
          {application.error.message}
        </StateMessage>
      </>
    )
  }

  return (
    <>
      {header}
      <div className={styles.title}>
        <h1>Editar postulación</h1>
        <p className={styles.subtitle}>
          {application.data.company}, {application.data.position}
        </p>
      </div>
      <ApplicationForm
        initialValues={toFormValues(application.data)}
        today={today}
        submitLabel="Guardar cambios"
        onSubmit={async (input) => {
          await update.mutateAsync(input)
          toast.show('Cambios guardados')
          navigate(returnTo)
        }}
        onCancel={() => navigate(returnTo)}
      />
    </>
  )
}

function NotFound() {
  return (
    <>
      <title>Postulación no encontrada – Job Tracker</title>
      <StateMessage
        title="No encontramos esta postulación"
        action={
          <Link to="/" className="btn btn-secondary">
            Ir a mis postulaciones
          </Link>
        }
      >
        Puede que se haya eliminado o que el enlace esté incompleto.
      </StateMessage>
    </>
  )
}
