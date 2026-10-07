import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCreateApplication } from '../../api/queries'
import { ArrowLeftIcon } from '../../components/icons'
import { useToast } from '../../components/toast/ToastContext'
import { todayIso } from '../../lib/dates'
import { ApplicationForm } from './ApplicationForm'
import { useReturnTo } from './useReturnTo'
import { emptyFormValues } from './validation'
import styles from './FormPage.module.css'

export function NewApplicationPage() {
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const toast = useToast()
  const create = useCreateApplication()
  // La fecha de hoy se calcula una sola vez, al abrir la página.
  const [today] = useState(todayIso)

  return (
    <>
      <title>Nueva postulación – Job Tracker</title>
      <Link to={returnTo} className={styles.back}>
        <ArrowLeftIcon />
        Volver a postulaciones
      </Link>
      <div className={styles.title}>
        <h1>Nueva postulación</h1>
        <p className={styles.subtitle}>Registra una vacante a la que aplicaste.</p>
      </div>
      <ApplicationForm
        initialValues={emptyFormValues(today)}
        today={today}
        submitLabel="Guardar postulación"
        onSubmit={async (input) => {
          await create.mutateAsync(input)
          toast.show('Postulación guardada')
          navigate(returnTo)
        }}
        onCancel={() => navigate(returnTo)}
      />
    </>
  )
}
