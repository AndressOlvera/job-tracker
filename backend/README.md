# Backend · API en Flask

API REST de Job Tracker. El contrato completo (endpoints, parámetros y errores) está en [docs/03-api.md](../docs/03-api.md).

## Requisitos

- Docker Desktop abierto, con la integración de WSL activada para Ubuntu.
- Python 3.12 o más reciente, con `python3-venv`.

## Puesta en marcha

Todos los comandos van en la terminal de Ubuntu.

```bash
# 1. Variables de entorno (desde la raíz del repositorio)
cd ~/proyectos/job-tracker
cp .env.example .env

# 2. Base de datos
docker compose up -d db
docker compose ps            # espera a que diga "healthy"

# 3. Entorno virtual de Python y dependencias
cd backend
python3 -m venv .venv
source .venv/bin/activate    # el prompt empezará con (.venv)
pip install -r requirements-dev.txt

# 4. Tablas y datos de ejemplo
flask db upgrade             # aplica las migraciones
flask seed                   # carga 30 postulaciones de ejemplo

# 5. Levantar la API
flask run                    # http://localhost:5000
```

Cada vez que abras una terminal nueva para trabajar, entra a `backend/` y activa el entorno con `source .venv/bin/activate`.

## Probar la API a mano

```bash
curl localhost:5000/api/v1/health
curl "localhost:5000/api/v1/applications?status=interview&sort=company"
curl localhost:5000/api/v1/stats

curl -X POST localhost:5000/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{"company": "Oracle", "position": "Becario de Software", "source": "OCC"}'

curl -X PATCH localhost:5000/api/v1/applications/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "interview"}'

curl -X DELETE localhost:5000/api/v1/applications/1
```

También puedes abrir las rutas `GET` directo en el navegador.

## Pruebas y calidad

```bash
pytest                     # corre todas las pruebas y muestra la cobertura
pytest -k stats --no-cov   # solo las pruebas cuyo nombre contiene "stats" (sin medir cobertura)
ruff check .               # busca errores y malas prácticas
ruff format .              # da formato al código
```

Las pruebas usan la base `jobtracker_test`, separada de la de desarrollo, así que no borran tus datos. La base de datos debe estar arriba (`docker compose up -d db`). Si la cobertura baja de 80 %, `pytest` falla. Por eso, al correr solo una parte de las pruebas se agrega `--no-cov`: unas cuantas pruebas nunca cubren el 80 % del código y `pytest` marcaría un fallo aunque todas pasen.

La CI corre estos mismos comandos en cada pull request, con un PostgreSQL temporal ([docs/07-ci.md](../docs/07-ci.md)).

## Estructura

```
backend/
├── app/
│   ├── __init__.py        # create_app(): arma la aplicación
│   ├── config.py          # configuración por entorno (development, testing, production)
│   ├── extensions.py      # instancias de SQLAlchemy y Flask-Migrate
│   ├── models.py          # tabla applications y estados posibles
│   ├── schemas.py         # reglas de validación y formato de respuestas (Pydantic)
│   ├── validation.py      # lee la petición, valida y traduce errores al español
│   ├── errors.py          # formato JSON común de los errores
│   ├── clock.py           # la fecha de "hoy" según la zona horaria
│   ├── cli.py             # comando `flask seed`
│   ├── api/               # rutas HTTP (una por archivo de recurso)
│   └── services/          # lógica y consultas a la base de datos
├── migrations/            # historial de cambios de la base de datos (Alembic)
├── tests/                 # pruebas con pytest
├── Dockerfile             # imagen de Docker de la API
└── gunicorn.conf.py       # configuración de Gunicorn, el servidor en Docker y AWS
```

### Recorrido de una petición

Así viaja `POST /api/v1/applications`:

1. **Ruta** (`api/applications.py`) recibe la petición.
2. **Validación** (`validation.py` + `schemas.py`) revisa el JSON. Si algo está mal, responde `422` con el detalle por campo.
3. **Servicio** (`services/applications.py`) crea el registro y lo guarda.
4. **Modelo** (`models.py`) define cómo se guarda en PostgreSQL, que vuelve a validar con sus restricciones.
5. **Esquema de salida** (`ApplicationOut`) convierte el registro en JSON y la ruta responde `201`.

Las rutas solo se encargan de HTTP; la lógica vive en los servicios. Así cada parte es más fácil de entender, cambiar y probar.

## En Docker

La API también corre en Docker junto con el resto de la app (`docker compose up -d` desde la raíz; guía en [docs/06-docker.md](../docs/06-docker.md)). Las diferencias con `flask run`:

- La sirve **Gunicorn** con 2 procesos. El servidor de `flask run` es solo para desarrollo: no está hecho para ser eficiente, estable ni seguro con tráfico real.
- Corre con `APP_ENV=production` y se conecta a la base por el nombre del servicio (`db:5432`), no por `localhost`.
- Las migraciones las aplica antes el servicio `migrate`; no hace falta correr `flask db upgrade` a mano.
- Para usar un comando de `flask` dentro del contenedor: `docker compose exec api flask seed`.

## Cambiar la base de datos

Nunca se modifica una tabla a mano. El proceso es:

1. Cambia el modelo en `app/models.py`.
2. Genera la migración: `flask db migrate -m "describe el cambio"`.
3. **Revisa** el archivo nuevo en `migrations/versions/`; Alembic no siempre detecta todo.
4. Aplícala: `flask db upgrade`.
5. Súbela a Git junto con el cambio del modelo.

La prueba `test_migrations_match_models` falla si cambias un modelo y olvidas el paso 2.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| `Connection refused` en el puerto 5432 | La base no está arriba: `docker compose up -d db` y revisa que Docker Desktop esté abierto. |
| `port is already allocated` al levantar la base | Ya tienes otro PostgreSQL en el 5432. Cambia `POSTGRES_PORT` en `.env` (por ejemplo a `5433`) y el puerto de las dos URL. |
| `database "jobtracker_test" does not exist` | El volumen se creó antes de existir el script que crea esa base. Recréalo: `docker compose down -v` y `docker compose up -d db` (borra los datos de desarrollo). |
| `flask: command not found` o `No module named ...` | Activa el entorno virtual: `source .venv/bin/activate`. |
| `password authentication failed` | Cambiaste el usuario o la contraseña en `.env` después de crear el volumen. Recréalo con `docker compose down -v`. |
