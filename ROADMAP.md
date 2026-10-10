# Roadmap

Cada casilla es una **issue** de GitHub. Cópialas al empezar cada fase (no hace falta crearlas todas desde el inicio) y marca la casilla aquí cuando se cierre.

## Cómo se trabaja cada issue

1. Crea la issue en GitHub con el título y el "Listo cuando" como criterio de aceptación.
2. Crea una rama desde `main` con prefijo según el tipo de cambio:
   `feat/`, `fix/`, `test/`, `docs/`, `ci/`, `infra/`, `chore/`. Ejemplo: `feat/crud-endpoints`.
3. Haz commits pequeños con el formato [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):
   `feat(api): agrega endpoint para crear postulaciones`.
4. Abre un pull request hacia `main` que incluya `Closes #<número>` en la descripción.
5. Revisa tú mismo el diff, únelo y borra la rama.

---

## Fase 0 · Diseño y repositorio

- [x] Definir requisitos e historias de usuario → [docs/01-requisitos.md](docs/01-requisitos.md)
- [x] Diseñar el modelo de datos → [docs/02-modelo-de-datos.md](docs/02-modelo-de-datos.md)
- [x] Diseñar la API → [docs/03-api.md](docs/03-api.md)
- [x] Bocetar las pantallas → [docs/04-pantallas.md](docs/04-pantallas.md)
- [x] Registrar decisiones de diseño → [docs/05-decisiones.md](docs/05-decisiones.md)
- [x] Crear el repositorio en GitHub y subir el primer commit

## Fase 1 · Backend local

- [x] **Base de datos local con Docker Compose**
  - Listo cuando: `docker compose up db` levanta PostgreSQL y existe `.env.example` con las variables necesarias.
- [x] **Estructura de la app Flask**
  - Listo cuando: existe la app con *application factory*, configuración por entorno (desarrollo, pruebas, producción) y `GET /api/v1/health` responde.
- [x] **Modelo `Application` y primera migración**
  - Listo cuando: `flask db upgrade` crea la tabla igual a [docs/02-modelo-de-datos.md](docs/02-modelo-de-datos.md).
- [x] **Endpoints CRUD con validación**
  - Listo cuando: crear, obtener, modificar y eliminar funcionan con las reglas y el formato de errores de [docs/03-api.md](docs/03-api.md).
- [x] **Filtros, búsqueda, orden y paginación**
  - Listo cuando: `GET /applications` acepta todos los parámetros documentados.
- [x] **Endpoint de estadísticas**
  - Listo cuando: `GET /stats` devuelve los totales y tasas, incluido el caso sin datos.
- [x] **Pruebas con pytest**
  - Listo cuando: cada endpoint tiene pruebas de éxito y de error, y la cobertura es ≥ 80 %.
- [x] **Linter y datos de ejemplo**
  - Listo cuando: `ruff check` pasa sin errores y un comando carga postulaciones de ejemplo.

## Fase 2 · Frontend local

- [x] **Proyecto React + TypeScript con Vite**
  - Listo cuando: el proyecto arranca, ESLint y Prettier están configurados y el proxy de `/api` llega a Flask.
- [x] **Cliente de la API con tipos**
  - Listo cuando: existen tipos de TypeScript para `Application`, filtros y estadísticas, y funciones para cada endpoint.
- [x] **Pantalla de lista** (HU-02, HU-03, HU-07)
  - Listo cuando: muestra la tabla con filtros en la URL, orden, paginación y estados de carga, vacío y error.
- [x] **Formulario de crear y editar** (HU-01, HU-04)
  - Listo cuando: valida en el navegador, muestra los errores `422` de la API por campo y evita envíos dobles.
- [x] **Eliminar con confirmación** (HU-05)
- [x] **Pantalla de estadísticas** (HU-06)
  - Listo cuando: muestra las cifras y las dos gráficas, incluido el caso sin datos. Las gráficas se hicieron sin Recharts ([ADR-011](docs/05-decisiones.md#adr-011-gráficas-propias-en-lugar-de-recharts)).
- [x] **Pruebas con Vitest y React Testing Library**
  - Listo cuando: el formulario, los filtros y la confirmación de borrado tienen pruebas.
- [x] **Diseño responsive y accesible**
  - Listo cuando: funciona en pantalla de celular y se puede usar completo con teclado.

## Fase 3 · Docker

- [x] **Dockerfile de la API**
  - Listo cuando: la imagen usa Gunicorn, corre con un usuario sin privilegios y tiene *healthcheck*.
- [x] **Dockerfile del frontend**
  - Listo cuando: compila la app y la sirve con Nginx, que además redirige `/api` a la API.
- [x] **Docker Compose completo**
  - Listo cuando: `docker compose up` levanta base de datos, API y frontend, y aplica las migraciones al iniciar.
  - Guía: [docs/06-docker.md](docs/06-docker.md). Decisiones: ADR-014 y ADR-015.

## Fase 4 · CI y calidad

- [x] **CI del backend** (GitHub Actions)
  - Listo cuando: en cada pull request corren ruff y pytest contra un PostgreSQL temporal, y se genera el reporte de cobertura.
- [x] **CI del frontend**
  - Listo cuando: corren ESLint, la revisión de tipos (`tsc`), Vitest y el build.
- [x] **SonarQube Cloud**
  - Listo cuando: cada pull request se analiza y el Quality Gate aparece en GitHub.
- [x] **Pruebas de navegador con Playwright**
  - Listo cuando: el flujo crear → editar → filtrar → eliminar corre en CI sobre Docker Compose.
  - El navegador de prueba usa la zona horaria `America/Mexico_City`, la misma que `APP_TIMEZONE` (ADR-017).
- [x] **Protección de `main` e insignias**
  - Listo cuando: no se puede unir un pull request con checks fallidos y el README muestra el estado de CI y del Quality Gate.
  - Guía y configuración en GitHub y SonarQube Cloud: [docs/07-ci.md](docs/07-ci.md). Decisiones: ADR-016 a ADR-018.

## Fase 5 · Infraestructura en AWS

- [ ] **Estado remoto de Terraform**
  - Listo cuando: el bucket de S3 para el estado existe (creado una sola vez) y `infra/` lo usa con bloqueo.
- [ ] **Red**
  - Listo cuando: existe la VPC con subredes públicas y privadas, sin NAT Gateway.
- [ ] **Registro de imágenes (ECR)**
- [ ] **Base de datos (RDS PostgreSQL)**
  - Listo cuando: RDS está en subredes privadas y su contraseña se guarda en SSM Parameter Store.
- [ ] **Servidor de la API (EC2)**
  - Listo cuando: la instancia tiene un rol IAM para leer de ECR y SSM, instala Docker al arrancar y se administra con Session Manager, sin SSH.
- [ ] **Frontend (S3 + CloudFront)**
  - Listo cuando: CloudFront sirve el frontend desde un bucket privado y redirige `/api/*` a EC2 sin caché.
- [ ] **Primer despliegue manual**
  - Listo cuando: la app funciona desde la URL de CloudFront y el procedimiento para levantar y destruir todo está documentado.

## Fase 6 · Despliegue automático

- [ ] **Conexión OIDC entre GitHub y AWS**
  - Listo cuando: Terraform crea el proveedor OIDC y un rol que solo puede asumir este repositorio desde `main`.
- [ ] **Despliegue de la API**
  - Listo cuando: al unir a `main` se construye la imagen, se sube a ECR, se actualiza EC2 y se aplican las migraciones.
- [ ] **Despliegue del frontend**
  - Listo cuando: al unir a `main` se compila, se sube a S3 y se invalida la caché de CloudFront.
- [ ] **Prueba posterior al despliegue**
  - Listo cuando: el workflow verifica `GET /api/v1/health` y falla si no responde.

## Fase 7 · Pulido para el CV

- [ ] **README final**
  - Listo cuando: incluye capturas o GIF, diagrama de arquitectura, cómo correrlo, tecnologías y decisiones.
- [ ] **Video de demostración**
- [ ] **Descripción del proyecto para el CV**

## Después del MVP (opcionales)

- [ ] Registro e inicio de sesión de usuarios
- [ ] Historial de cambios de estado
- [ ] Alarmas de CloudWatch con aviso por correo (SNS)
- [ ] Dominio propio con HTTPS
