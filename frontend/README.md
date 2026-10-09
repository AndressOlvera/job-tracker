# Frontend · React + TypeScript

Interfaz de Job Tracker: la lista de postulaciones con filtros, el formulario para crear y editar, y las estadísticas con gráficas. Habla con la API de [backend/](../backend/README.md); las pantallas están descritas en [docs/04-pantallas.md](../docs/04-pantallas.md).

## Requisitos

- **Node.js 24** instalado con `nvm` en Ubuntu (WSL). La versión está fijada en `.nvmrc`.
- La API corriendo en `http://localhost:5000` (ver [backend/README.md](../backend/README.md)).

## Puesta en marcha

Se usan **dos terminales de Ubuntu**: una para la API y otra para el frontend.

```bash
# Terminal 1: base de datos y API
cd ~/proyectos/job-tracker
docker compose up -d db
cd backend
source .venv/bin/activate
flask run                    # http://localhost:5000

# Terminal 2: frontend
cd ~/proyectos/job-tracker/frontend
nvm use                      # cambia a la versión de .nvmrc (instálala con `nvm install` si falta)
npm install                  # la primera vez y cada vez que cambie package.json
npm run dev                  # http://localhost:5173
```

Abre `http://localhost:5173` en el navegador. Al guardar un archivo, la página se actualiza sola.

`npm install` crea `package-lock.json`, que fija la versión exacta de cada dependencia. **Ese archivo se sube a Git** para que tu computadora, la CI y Docker instalen exactamente lo mismo. La carpeta `node_modules/` no se sube.

## Cómo llega el frontend a la API

El frontend pide los datos a `/api/v1/...` en su mismo origen (`localhost:5173`). El servidor de Vite reenvía todo lo que empieza con `/api` a Flask, en `127.0.0.1:5000` (configurado en `vite.config.ts`).

```
navegador ──► localhost:5173 (Vite) ──/api/*──► 127.0.0.1:5000 (Flask)
```

Como el navegador solo ve un origen, **no hace falta configurar CORS en Flask** ([ADR-005](../docs/05-decisiones.md#adr-005-mismo-origen-para-frontend-y-api)). En AWS, CloudFront hará el mismo papel que el proxy de Vite.

Si la API está apagada, la app muestra "La API no respondió. Revisa que esté encendida e intenta de nuevo." con un botón para reintentar.

## Comandos

| Comando                | Qué hace                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con recarga automática                          |
| `npm test`             | Corre todas las pruebas una vez                                        |
| `npm run test:watch`   | Corre las pruebas y las repite al guardar cambios                      |
| `npm run lint`         | Revisa el código con ESLint                                            |
| `npm run typecheck`    | Revisa los tipos de TypeScript sin compilar                            |
| `npm run format`       | Da formato a todo con Prettier                                         |
| `npm run format:check` | Solo revisa el formato (es lo que hará la CI)                          |
| `npm run build`        | Revisa los tipos y genera la versión de producción en `dist/`          |
| `npm run preview`      | Sirve la versión de `dist/` para probarla (también con proxy a la API) |

Antes de abrir un pull request conviene correr `npm run lint`, `npm run typecheck` y `npm test`. En la Fase 4 la CI los correrá en cada pull request.

## Pruebas

Las pruebas usan **Vitest** con **React Testing Library**. Corren en Node con `jsdom`, que simula el navegador, así que **no necesitan la API encendida**: cada prueba responde las peticiones con datos falsos (`src/test/mockApi.ts`).

Las pruebas usan la app como lo haría una persona: buscan botones y campos por su texto o etiqueta, hacen clic y escriben con `user-event`, y revisan lo que aparece en pantalla y las peticiones que se mandaron.

| Archivo                                                      | Qué cubre                                                                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `ApplicationsPage.test.tsx`                                  | Lista, filtros en la URL, búsqueda con espera, orden, paginación, estados vacío y de error, y eliminar con confirmación |
| `ApplicationForm.test.tsx`                                   | Crear y editar, validación en el navegador, errores `422` de la API por campo y envíos dobles                           |
| `StatsPage.test.tsx`                                         | Totales, tasas, gráficas, meses en 0 y el caso sin datos                                                                |
| `filters.test.ts`, `validation.test.ts`, `chartData.test.ts` | Funciones de lógica: leer filtros de la URL, reglas del formulario y datos de las gráficas                              |
| `client.test.ts`, `format.test.ts`, `dates.test.ts`          | Peticiones y manejo de errores, formatos de fecha, número y porcentaje                                                  |

Para correr solo un archivo: `npx vitest run ApplicationForm`.

## Estructura

```
frontend/
├── index.html               # página base; Vite inyecta aquí la app
├── vite.config.ts           # proxy de /api y configuración de Vitest
├── eslint.config.js         # reglas de ESLint
├── Dockerfile               # imagen de Docker: compila con Node y sirve con Nginx
├── nginx/                   # configuración de Nginx dentro de Docker
├── public/                  # archivos que se sirven tal cual (ícono y tipografía)
└── src/
    ├── main.tsx             # punto de entrada: monta la app con sus proveedores
    ├── App.tsx              # rutas de la app
    ├── index.css            # colores, tipografía, botones y campos globales
    ├── api/                 # tipos, peticiones a la API y hooks de TanStack Query
    ├── components/          # piezas compartidas: layout, diálogo, avisos, íconos
    ├── features/
    │   ├── applications/    # lista, filtros, tabla, formulario y sus pruebas
    │   └── stats/           # pantalla de estadísticas y gráficas
    ├── lib/                 # utilidades: estados, fechas y formatos
    └── test/                # configuración y ayudantes de las pruebas
```

Cada componente tiene junto a él su archivo `.module.css` (**CSS Modules**): las clases solo aplican a ese componente, así no chocan entre pantallas.

### Recorrido de una acción

Así funciona guardar una postulación nueva:

1. **`ApplicationForm`** valida en el navegador con las mismas reglas y mensajes que la API (`validation.ts`). Si hay errores, los muestra debajo de cada campo y mueve el foco al primero.
2. **`useCreateApplication`** (`api/queries.ts`) manda el `POST` mediante `api/applications.ts` → `api/client.ts`.
3. Si la API responde `422`, los errores se muestran en sus campos. Si responde `201`, TanStack Query marca como viejas la lista y las estadísticas para que se vuelvan a pedir.
4. La app regresa a la lista (con los filtros que tenías) y muestra el aviso "Postulación guardada".

## En Docker

En Docker, el frontend no usa el servidor de Vite. La imagen hace `npm run build` y sirve los archivos resultantes con **Nginx** en `http://localhost:8080` (`docker compose up -d` desde la raíz; guía en [docs/06-docker.md](../docs/06-docker.md)).

Nginx cumple el mismo papel que el proxy de Vite: reenvía `/api` a la API, así que el código del frontend es el mismo en los dos modos. Además, responde `index.html` en las rutas de la app (`/stats`, `/applications/3/edit`), guarda en caché los archivos con hash, comprime las respuestas y agrega cabeceras de seguridad. Todo eso está en `nginx/default.conf.template`.

## Decisiones principales

- **TanStack Query** guarda en caché las respuestas de la API, maneja los estados de carga y error, y vuelve a pedir los datos después de crear, editar o eliminar ([ADR-012](../docs/05-decisiones.md#adr-012-tanstack-query-para-los-datos-de-la-api)).
- **Los filtros viven en la URL** (`/?status=interview&q=oracle&page=2`): al recargar, compartir el enlace o usar atrás/adelante se conservan ([ADR-013](../docs/05-decisiones.md#adr-013-los-filtros-de-la-lista-viven-en-la-url)).
- **Gráficas hechas con HTML y CSS**, sin Recharts ([ADR-011](../docs/05-decisiones.md#adr-011-gráficas-propias-en-lugar-de-recharts)).
- **Accesibilidad:** todo se puede usar con teclado (incluido un enlace para saltar al contenido), los errores se anuncian a los lectores de pantalla y cada gráfica tiene su tabla de datos.

## Problemas comunes

| Síntoma                                                       | Solución                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| "La API no respondió" o "No se pudo conectar con el servidor" | Flask no está corriendo. Levántalo en otra terminal con `flask run` (y la base con `docker compose up -d db`).      |
| `npm: command not found` o `nvm: command not found`           | Cierra y vuelve a abrir la terminal después de instalar nvm. Luego `nvm install` dentro de `frontend/`.             |
| `EBADENGINE` o errores raros al instalar                      | Estás con otra versión de Node. Corre `nvm use` y repite `npm install`.                                             |
| Vite abre en el puerto 5174 en lugar del 5173                 | Ya tienes otro `npm run dev` abierto en otra terminal. Ciérralo con `Ctrl + C` o usa la dirección que muestra Vite. |
| La lista sale vacía aunque la API tiene datos                 | Revisa que la URL no tenga filtros (`/?q=...`) y usa **Limpiar filtros**.                                           |
