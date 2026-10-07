# 5. Decisiones de diseño (ADR)

Un ADR (*Architecture Decision Record*) registra una decisión importante, por qué se tomó y qué consecuencias tiene. Sirve para que cualquiera (incluido tú en seis meses, o un entrevistador) entienda el porqué del proyecto, no solo el qué.

Cuando una decisión cambie, no se borra: se agrega un ADR nuevo que la reemplaza.

---

## ADR-001: Monorepo

**Contexto.** El proyecto tiene backend, frontend, pruebas e2e e infraestructura.

**Decisión.** Todo vive en un solo repositorio, en carpetas separadas.

**Consecuencias.**
- ✅ Un solo lugar para ver el proyecto completo; ideal para un portafolio.
- ✅ Un cambio que toca API y frontend va en un solo pull request.
- ⚠️ Los workflows de CI deben filtrar por carpeta para no correr todo en cada cambio (`paths` en GitHub Actions).

---

## ADR-002: Flask + SQLAlchemy + Alembic + Pydantic

**Contexto.** Hace falta una API REST en Python con base de datos relacional y validación de datos.

**Decisión.**
- **Flask** como framework web: ligero y ya lo usaste en el proyecto de EC2.
- **SQLAlchemy 2** como ORM, para no escribir SQL a mano en cada consulta.
- **Flask-Migrate (Alembic)** para versionar los cambios de la estructura de la base de datos.
- **Pydantic v2** para validar los datos que entran y dar formato a los que salen.

**Consecuencias.**
- ✅ Herramientas muy pedidas en vacantes de backend con Python.
- ✅ Las migraciones permiten recrear la base de datos idéntica en local, en CI y en AWS.
- ⚠️ Flask no integra Pydantic de forma nativa; se crea una pequeña capa propia para validar y convertir errores al formato de la API.

---

## ADR-003: PostgreSQL, con el estado como texto y `CHECK`

**Contexto.** El estado de una postulación tiene un conjunto fijo de valores.

**Decisión.** Guardar `status` como `VARCHAR(20)` con una restricción `CHECK`, en lugar de un tipo `ENUM` de PostgreSQL.

**Consecuencias.**
- ✅ Agregar un estado nuevo es una migración sencilla (cambiar el `CHECK`); modificar un `ENUM` es más delicado.
- ✅ La base de datos sigue rechazando valores inválidos.
- ⚠️ Los valores válidos están repetidos en la BD, en la API y en el frontend; se mantienen sincronizados con pruebas.

---

## ADR-004: Sin autenticación en el MVP

**Contexto.** Agregar usuarios e inicio de sesión aumenta mucho el alcance.

**Decisión.** El MVP es de un solo usuario y no tiene inicio de sesión.

**Consecuencias.**
- ✅ El esfuerzo se concentra en lo que más demuestra el proyecto: pruebas, CI/CD e infraestructura.
- ⚠️ Mientras esté publicada en AWS, **cualquiera con la URL puede ver y modificar los datos**. Por eso la versión publicada usa solo datos de ejemplo y la infraestructura se apaga cuando no se usa.
- ➡️ Es la primera mejora planeada después del MVP.

---

## ADR-005: Mismo origen para frontend y API

**Contexto.** Si el frontend y la API están en dominios distintos, el navegador exige configurar CORS.

**Decisión.** El navegador siempre habla con un solo dominio:
- **En local:** el servidor de desarrollo de Vite redirige `/api/*` hacia Flask (proxy).
- **En AWS:** CloudFront sirve el frontend desde S3 y redirige `/api/*` hacia la API en EC2.

**Consecuencias.**
- ✅ No hace falta CORS, que es una fuente común de errores y de configuraciones inseguras.
- ✅ La API queda detrás de HTTPS gracias a CloudFront, sin comprar un dominio ni configurar certificados en EC2.
- ⚠️ CloudFront no debe guardar en caché las respuestas de `/api/*`; se configura una política sin caché para esa ruta.
- ⚠️ El tramo entre CloudFront y EC2 va por HTTP. Para limitar el riesgo, el security group de EC2 solo acepta tráfico de CloudFront (usando su lista de prefijos administrada por AWS), no de cualquier IP.

---

## ADR-006: API en EC2 con Docker

**Contexto.** AWS ofrece varias formas de correr la API: EC2, ECS/Fargate, App Runner, Lambda.

**Decisión.** Un contenedor Docker en una instancia EC2.

**Consecuencias.**
- ✅ Bajo costo y cabe en los créditos.
- ✅ Continúa lo aprendido en el proyecto de EC2 y en el curso de Cloud Practitioner.
- ✅ Docker hace que el mismo contenedor corra igual en local, en CI y en AWS.
- ⚠️ Una sola instancia: si falla, la API se cae. Para un portafolio es aceptable; la mejora sería Auto Scaling + balanceador o ECS.
- ⚠️ Se administra por **SSM Session Manager**, sin abrir el puerto 22 (SSH) a internet.

---

## ADR-007: Infraestructura como código y destruible

**Contexto.** Los recursos de AWS cuestan mientras existen, y los créditos son limitados.

**Decisión.**
- Toda la infraestructura se define con **Terraform** en `infra/`.
- El estado de Terraform se guarda en un bucket de S3 con bloqueo nativo, no en la computadora.
- Región: `us-east-1`.
- La red no usa NAT Gateway (cobra por hora): la base de datos va en subredes privadas y la instancia EC2 en una subred pública con un security group restrictivo.

**Consecuencias.**
- ✅ Con `terraform apply` se levanta todo en minutos y con `terraform destroy` se elimina.
- ✅ La infraestructura queda documentada y versionada en Git.
- ⚠️ El bucket del estado se crea aparte (una sola vez) y no se destruye con el resto.

---

## ADR-008: Borrado físico

**Contexto.** Al eliminar una postulación se puede borrar la fila (borrado físico) o marcarla como eliminada (borrado lógico).

**Decisión.** Borrado físico (`DELETE`).

**Consecuencias.**
- ✅ Más simple, y en el MVP no hay necesidad de recuperar registros.
- ⚠️ No se puede deshacer; por eso la interfaz pide confirmación.

---

## ADR-009: "Hoy" según la zona horaria de la aplicación

**Contexto.** Los servidores y contenedores normalmente usan UTC. A las 8 p. m. en Guadalajara ya es el día siguiente en UTC, así que `date.today()` pondría como fecha de postulación "mañana" y la validación de fechas futuras rechazaría la fecha real del usuario.

**Decisión.** La fecha de hoy se calcula con la zona horaria configurada en `APP_TIMEZONE` (por defecto `America/Mexico_City`), en un solo lugar: `app/clock.py`.

**Consecuencias.**
- ✅ El valor por defecto y la validación coinciden con el calendario del usuario.
- ✅ Las pruebas reemplazan `clock.today` por una fecha fija, así dan el mismo resultado cualquier día.
- ⚠️ Con usuarios en varias zonas horarias habría que recibir la zona desde el frontend. Para el MVP basta con una.

---

## ADR-010: Pruebas contra PostgreSQL real

**Contexto.** Una opción común es probar con SQLite en memoria porque es más rápido de configurar.

**Decisión.** Las pruebas usan una base PostgreSQL separada (`jobtracker_test`), creada con las mismas migraciones que se usan en producción. Antes de cada prueba se vacía la tabla.

**Consecuencias.**
- ✅ Se prueba lo que de verdad corre en producción: `ILIKE`, `to_char`, las restricciones `CHECK` y las migraciones.
- ✅ Una prueba detecta si un modelo cambió y falta crear su migración.
- ⚠️ Para correr las pruebas hay que tener PostgreSQL arriba (`docker compose up -d db`). En CI se usará un contenedor de PostgreSQL.

---

## ADR-011: Gráficas propias en lugar de Recharts

**Contexto.** El plan original usaba Recharts para la pantalla de estadísticas. Solo hay dos gráficas y las dos son sencillas: barras horizontales por estado y columnas por mes. Recharts es una librería grande pensada para gráficas mucho más complejas.

**Decisión.** Las gráficas se dibujan con HTML y CSS (`features/stats/`): cada barra es un elemento con su ancho o alto en porcentaje. Los cálculos (rellenar con 0 los meses sin postulaciones, elegir el tope del eje) viven en `chartData.ts`, separados del dibujo y con sus propias pruebas.

**Consecuencias.**
- ✅ Una dependencia menos que mantener y menos JavaScript que descargar.
- ✅ Control total del diseño: barras delgadas, etiquetas solo donde ayudan, detalle al pasar el mouse o al llegar con el teclado.
- ✅ Accesibles sin trabajo extra: cada barra es un elemento de lista con texto ("Postulado: 15 postulaciones, 62.5 % del total") y cada gráfica tiene una tabla con los datos.
- ✅ Se prueban como el resto de la app, con React Testing Library.
- ⚠️ Si después hacen falta gráficas complejas (líneas con muchos puntos, zoom, ejes de tiempo continuos), conviene volver a una librería como Recharts.

---

## ADR-012: TanStack Query para los datos de la API

**Contexto.** Las tres pantallas piden datos a la API. En cada una hay que manejar la carga, los errores y los reintentos; cancelar la petición anterior cuando cambia un filtro, y volver a pedir la lista y las estadísticas después de crear, editar o eliminar. Hacerlo a mano con `useEffect` y `useState` repite código en cada pantalla y es una fuente común de errores, como mostrar una respuesta vieja que llegó tarde.

**Decisión.** Los datos que vienen de la API se manejan con **TanStack Query** (`src/api/queries.ts`). Lo que solo existe en la pantalla, como lo que se escribe en el formulario o si el diálogo está abierto, se queda en `useState`. No se usa una librería de estado global como Redux.

**Consecuencias.**
- ✅ Cada combinación de filtros se guarda en caché: regresar a una página ya vista es instantáneo.
- ✅ Al cambiar de filtro se cancela la petición anterior y se sigue mostrando la lista actual hasta que llega la nueva, sin parpadeos.
- ✅ Después de guardar o eliminar se invalidan las llaves `applications` y `stats`, y todo se actualiza solo.
- ✅ Los errores `4xx` (como un `404`) no se reintentan; los de red o `5xx` sí, hasta dos veces.
- ⚠️ Es una dependencia más, con conceptos propios (llaves de consulta, invalidación).
- ⚠️ Cada prueba crea su propio `QueryClient` sin reintentos, para que una prueba no herede la caché de otra.

---

## ADR-013: Los filtros de la lista viven en la URL

**Contexto.** La lista tiene búsqueda, filtro por estado, rango de fechas, orden y paginación. Si esos valores solo existieran en la memoria de la página, se perderían al recargar, al compartir el enlace o al regresar desde el formulario de edición.

**Decisión.** La URL es la única fuente de los filtros (`/?status=interview&q=oracle&page=2`), leída con `useSearchParams` de React Router.
- `filters.ts` convierte la URL en filtros válidos: lo que no tenga sentido (un estado que no existe, una fecha mal escrita, una página negativa) se ignora en lugar de romper la pantalla.
- Los valores por defecto no se escriben, así la URL queda limpia.
- Cualquier cambio de filtro regresa a la página 1.
- La búsqueda se aplica 300 ms después de dejar de escribir y reemplaza la entrada del historial, para no crear una por cada letra.
- Al abrir el formulario se guarda la URL de la lista, y al terminar se regresa a ella con los mismos filtros.

**Consecuencias.**
- ✅ Recargar, compartir el enlace y los botones atrás/adelante del navegador funcionan como se espera.
- ✅ Las pruebas pueden empezar en cualquier estado de la lista con solo indicar una URL.
- ⚠️ Cualquiera puede escribir la URL a mano, así que todo lo que llega por ahí se valida antes de usarlo.
